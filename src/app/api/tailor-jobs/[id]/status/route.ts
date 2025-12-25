/**
 * Piece Status API
 * 
 * Updates individual piece or job status with proper completed count tracking.
 * Ensures completed count only includes pieces with status = 'completed'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS, COMPLETED_STATUSES } from '@/lib/mongodb';
import { requirePermission, createErrorResponse } from '@/lib/rbac';
import { logStatusChange } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { JobStatus } from '@/lib/types';

/**
 * PATCH /api/tailor-jobs/[id]/status
 * Update job status with proper tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'Invalid job ID'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, updatedBy, reason } = body as {
      status: JobStatus;
      updatedBy?: string;
      reason?: string;
    };

    const validStatuses: JobStatus[] = ['pending', 'in-progress', 'completed', 'returned', 'ready-to-ship', 'shipped'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', `Invalid status. Must be one of: ${validStatuses.join(', ')}`),
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    // Get the job
    const job = await db.collection(COLLECTIONS.TAILOR_JOBS).findOne({
      _id: new ObjectId(id)
    });

    if (!job) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Job not found'),
        { status: 404 }
      );
    }

    const oldStatus = job.status;
    
    // Build update object
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now
    };

    // Track completed pieces properly
    if (status === 'completed' && oldStatus !== 'completed') {
      updateData.completedDate = now;
      updateData.completedPcs = job.returnedPcs || job.issuedPcs;
    } else if (oldStatus === 'completed' && status !== 'completed') {
      // Moving away from completed - reset completed pieces
      updateData.completedPcs = 0;
      updateData.completedDate = null;
    }

    // Update job
    const result = await db.collection(COLLECTIONS.TAILOR_JOBS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Update order sizes if applicable
    if (job.fabricCuttingId && job.styleId) {
      const pcsToUpdate = job.returnedPcs || job.issuedPcs;
      
      if (status === 'completed' && oldStatus !== 'completed') {
        // Add to completed count
        if (job.sizeBreakdown && job.sizeBreakdown.length > 0) {
          // Update each size
          for (const size of job.sizeBreakdown) {
            await db.collection(COLLECTIONS.ORDER_SIZES).updateOne(
              {
                fabricCuttingId: job.fabricCuttingId,
                styleId: job.styleId,
                sizeLabel: size.size
              },
              { $inc: { completedQty: size.quantity } }
            );
          }
        }
        
        // Update fabric cutting completed count
        await db.collection(COLLECTIONS.FABRIC_CUTTING).updateOne(
          { _id: job.fabricCuttingId },
          { $inc: { completedPcs: pcsToUpdate } }
        );
      } else if (oldStatus === 'completed' && status !== 'completed') {
        // Remove from completed count
        if (job.sizeBreakdown && job.sizeBreakdown.length > 0) {
          for (const size of job.sizeBreakdown) {
            await db.collection(COLLECTIONS.ORDER_SIZES).updateOne(
              {
                fabricCuttingId: job.fabricCuttingId,
                styleId: job.styleId,
                sizeLabel: size.size
              },
              { $inc: { completedQty: -size.quantity } }
            );
          }
        }
        
        await db.collection(COLLECTIONS.FABRIC_CUTTING).updateOne(
          { _id: job.fabricCuttingId },
          { $inc: { completedPcs: -pcsToUpdate } }
        );
      }

      // Handle shipped status
      if (status === 'shipped' && oldStatus !== 'shipped') {
        if (job.sizeBreakdown && job.sizeBreakdown.length > 0) {
          for (const size of job.sizeBreakdown) {
            await db.collection(COLLECTIONS.ORDER_SIZES).updateOne(
              {
                fabricCuttingId: job.fabricCuttingId,
                styleId: job.styleId,
                sizeLabel: size.size
              },
              { $inc: { shippedQty: size.quantity } }
            );
          }
        }
        
        await db.collection(COLLECTIONS.FABRIC_CUTTING).updateOne(
          { _id: job.fabricCuttingId },
          { $inc: { shippedPcs: pcsToUpdate } }
        );
      }
    }

    // Audit log
    await logStatusChange({
      entityType: 'tailorJob',
      entityId: id,
      oldStatus,
      newStatus: status,
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      reason
    });

    return NextResponse.json({
      success: true,
      message: `Job status updated to ${status}`,
      data: {
        jobId: id,
        oldStatus,
        newStatus: status,
        updatedAt: now
      }
    });

  } catch (error: any) {
    console.error('PATCH /api/tailor-jobs/[id]/status error:', error);
    
    if (error.name === 'AuthorizationError') {
      return NextResponse.json(
        createErrorResponse(error.code, error.message),
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to update job status'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/tailor-jobs/[id]/status
 * Get detailed status information for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'Invalid job ID'),
        { status: 400 }
      );
    }

    const db = await getDb();

    const job = await db.collection(COLLECTIONS.TAILOR_JOBS).findOne({
      _id: new ObjectId(id)
    });

    if (!job) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Job not found'),
        { status: 404 }
      );
    }

    // Calculate accurate counts
    const isCompleted = COMPLETED_STATUSES.includes(job.status as any);
    
    return NextResponse.json({
      success: true,
      data: {
        jobId: id,
        status: job.status,
        issuedPcs: job.issuedPcs,
        returnedPcs: job.returnedPcs,
        completedPcs: isCompleted ? (job.returnedPcs || job.issuedPcs) : 0,
        rejectedPcs: job.rejectedPcs || 0,
        pendingPcs: job.issuedPcs - (job.returnedPcs || 0),
        qcStatus: job.qcStatus,
        issueDate: job.issueDate,
        completedDate: job.completedDate,
        receivedDate: job.receivedDate,
        sizeBreakdown: job.sizeBreakdown
      }
    });

  } catch (error: any) {
    console.error('GET /api/tailor-jobs/[id]/status error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to get job status'),
      { status: 500 }
    );
  }
}
