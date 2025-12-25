/**
 * Distribution API
 * 
 * Endpoints for distributing pieces to tailors with size-level tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { requirePermission, createErrorResponse } from '@/lib/rbac';
import { logDistribution } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { DistributionAssignment, TailorSizeAssignment } from '@/lib/types';

/**
 * POST /api/order-sizes/distribute
 * Distribute pieces to tailors with size-level breakdown
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requirePermission('order:distribute');
    
    const body = await request.json();
    const { fabricCuttingId, styleId, assignments } = body as {
      fabricCuttingId: string;
      styleId: string;
      assignments: DistributionAssignment[];
    };

    if (!fabricCuttingId || !styleId || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'fabricCuttingId, styleId, and assignments array are required'),
        { status: 400 }
      );
    }

    const db = await getDb();
    const session = await getServerSession(authOptions);
    const now = new Date();

    // Start a session for transaction
    const mongoSession = (await db.command({ ping: 1 })) ? null : null; // MongoDB sessions for transactions
    
    try {
      // Validate all assignments first
      const validationErrors: string[] = [];
      
      // Get current size breakdown
      const orderSizes = await db.collection(COLLECTIONS.ORDER_SIZES)
        .find({
          fabricCuttingId: new ObjectId(fabricCuttingId),
          styleId: new ObjectId(styleId)
        })
        .toArray();

      const sizeMap = new Map(orderSizes.map(s => [s.sizeLabel, s]));

      // Check each assignment
      for (const assignment of assignments) {
        const sizeRecord = sizeMap.get(assignment.sizeLabel);
        
        if (!sizeRecord) {
          validationErrors.push(`Size ${assignment.sizeLabel} not found`);
          continue;
        }

        const currentAssigned = (sizeRecord.assignedToTailors || [])
          .reduce((sum: number, a: { qty: number }) => sum + a.qty, 0);
        const available = sizeRecord.qty - currentAssigned;

        if (assignment.qty > available) {
          validationErrors.push(
            `Size ${assignment.sizeLabel}: requested ${assignment.qty}, available ${available}`
          );
        }

        if (assignment.qty <= 0) {
          validationErrors.push(`Size ${assignment.sizeLabel}: quantity must be positive`);
        }
      }

      if (validationErrors.length > 0) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Assignment validation failed',
            ref: `ERR-${Date.now()}`
          },
          details: validationErrors,
          currentAvailability: Array.from(sizeMap.entries()).map(([label, size]) => ({
            sizeLabel: label,
            total: size.qty,
            assigned: (size.assignedToTailors || []).reduce((s: number, a: { qty: number }) => s + a.qty, 0),
            available: size.qty - (size.assignedToTailors || []).reduce((s: number, a: { qty: number }) => s + a.qty, 0)
          }))
        }, { status: 400 });
      }

      // Get tailor information
      const uniqueTailorIds = Array.from(new Set(assignments.map(a => a.tailorId)));
      const tailors = await db.collection('tailors')
        .find({ _id: { $in: uniqueTailorIds.map(id => new ObjectId(id)) } })
        .toArray();
      
      const tailorMap = new Map(tailors.map(t => [t._id!.toString(), t]));

      // Perform the distribution
      for (const assignment of assignments) {
        const tailor = tailorMap.get(assignment.tailorId);
        if (!tailor) {
          continue; // Skip if tailor not found
        }

        const tailorAssignment: TailorSizeAssignment = {
          tailorId: new ObjectId(assignment.tailorId),
          tailorName: tailor.name,
          qty: assignment.qty,
          assignedDate: now,
          completedQty: 0,
          status: 'pending'
        };

        // Update order size with new assignment
        await db.collection(COLLECTIONS.ORDER_SIZES).updateOne(
          {
            fabricCuttingId: new ObjectId(fabricCuttingId),
            styleId: new ObjectId(styleId),
            sizeLabel: assignment.sizeLabel
          },
          {
            $push: { assignedToTailors: tailorAssignment } as any,
            $set: { updatedAt: now }
          }
        );
      }

      // Get rate for this style
      const rate = await db.collection(COLLECTIONS.RATES).findOne({
        styleId: new ObjectId(styleId)
      });

      // Create tailor jobs for each unique tailor
      const tailorAssignmentGroups = assignments.reduce((acc, a) => {
        if (!acc[a.tailorId]) acc[a.tailorId] = [];
        acc[a.tailorId].push(a);
        return acc;
      }, {} as Record<string, DistributionAssignment[]>);

      for (const [tailorId, tailorAssignments] of Object.entries(tailorAssignmentGroups)) {
        const totalPcs = tailorAssignments.reduce((sum, a) => sum + a.qty, 0);
        const sizeBreakdown = tailorAssignments.map(a => ({
          size: a.sizeLabel,
          qty: a.qty
        }));

        // Create tailor job
        await db.collection(COLLECTIONS.TAILOR_JOBS).insertOne({
          styleId: new ObjectId(styleId),
          tailorId: new ObjectId(tailorId),
          fabricCuttingId: new ObjectId(fabricCuttingId),
          issuedPcs: totalPcs,
          rate: rate?.vendorRate || 0,
          issueDate: now,
          status: 'pending',
          returnedPcs: 0,
          qcStatus: 'pending',
          sizeBreakdown,
          createdAt: now,
          updatedAt: now
        });

        // Log distribution
        const tailor = tailorMap.get(tailorId);
        if (tailor && session?.user) {
          await logDistribution({
            fabricCuttingId,
            tailorId,
            tailorName: tailor.name,
            styleId,
            piecesDistributed: totalPcs,
            sizeBreakdown,
            actorId: session.user.id,
            actorName: session.user.name,
            actorRole: session.user.role
          });
        }
      }

      // Update fabric cutting distributed count
      const totalDistributed = assignments.reduce((sum, a) => sum + a.qty, 0);
      await db.collection(COLLECTIONS.FABRIC_CUTTING).updateOne(
        { _id: new ObjectId(fabricCuttingId) },
        {
          $inc: { distributedPcs: totalDistributed },
          $set: { updatedAt: now }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Distribution completed successfully',
        data: {
          totalDistributed,
          assignmentsCount: assignments.length,
          tailorsAssigned: Object.keys(tailorAssignmentGroups).length
        }
      });

    } catch (innerError) {
      throw innerError;
    }

  } catch (error: any) {
    console.error('POST /api/order-sizes/distribute error:', error);
    
    if (error.name === 'AuthorizationError') {
      return NextResponse.json(
        createErrorResponse(error.code, error.message),
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to distribute pieces'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/order-sizes/distribute
 * Get distribution status for a fabric cutting record
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fabricCuttingId = searchParams.get('fabricCuttingId');

    if (!fabricCuttingId) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'fabricCuttingId is required'),
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get order sizes with assignments
    const orderSizes = await db.collection(COLLECTIONS.ORDER_SIZES)
      .find({ fabricCuttingId: new ObjectId(fabricCuttingId) })
      .toArray();

    // Get tailor jobs for this cutting
    const tailorJobs = await db.collection(COLLECTIONS.TAILOR_JOBS)
      .find({ fabricCuttingId: new ObjectId(fabricCuttingId) })
      .toArray();

    // Get tailors info
    const tailorIds = Array.from(new Set(tailorJobs.map(j => j.tailorId.toString())));
    const tailors = await db.collection('tailors')
      .find({ _id: { $in: tailorIds.map(id => new ObjectId(id)) } })
      .toArray();
    
    const tailorMap = new Map(tailors.map(t => [t._id!.toString(), t]));

    // Build distribution summary
    const distributionSummary = {
      bySize: orderSizes.map(size => ({
        sizeLabel: size.sizeLabel,
        totalQty: size.qty,
        assigned: (size.assignedToTailors || []).reduce((s: number, a: { qty: number }) => s + a.qty, 0),
        available: size.qty - (size.assignedToTailors || []).reduce((s: number, a: { qty: number }) => s + a.qty, 0),
        assignments: (size.assignedToTailors || []).map((a: TailorSizeAssignment) => ({
          tailorId: a.tailorId.toString(),
          tailorName: a.tailorName,
          qty: a.qty,
          completedQty: a.completedQty,
          status: a.status,
          assignedDate: a.assignedDate
        }))
      })),
      byTailor: tailorJobs.map(job => {
        const tailor = tailorMap.get(job.tailorId.toString());
        return {
          tailorId: job.tailorId.toString(),
          tailorName: tailor?.name || 'Unknown',
          jobId: job._id?.toString(),
          issuedPcs: job.issuedPcs,
          returnedPcs: job.returnedPcs,
          status: job.status,
          sizeBreakdown: job.sizeBreakdown
        };
      }),
      totals: {
        totalPcs: orderSizes.reduce((s, size) => s + size.qty, 0),
        totalAssigned: orderSizes.reduce((s, size) => 
          s + (size.assignedToTailors || []).reduce((sum: number, a: { qty: number }) => sum + a.qty, 0), 0),
        totalAvailable: orderSizes.reduce((s, size) => 
          s + size.qty - (size.assignedToTailors || []).reduce((sum: number, a: { qty: number }) => sum + a.qty, 0), 0)
      }
    };

    return NextResponse.json({
      success: true,
      data: distributionSummary
    });

  } catch (error: any) {
    console.error('GET /api/order-sizes/distribute error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to get distribution status'),
      { status: 500 }
    );
  }
}
