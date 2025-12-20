import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { jobUpdateSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET single tailor job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager', 'tailor'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const job = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style',
          },
        },
        {
          $lookup: {
            from: 'tailors',
            localField: 'tailorId',
            foreignField: '_id',
            as: 'tailor',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$tailor', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    if (!job.length) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: job[0] });
  } catch (error) {
    console.error('Tailor Job GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update tailor job (update returned pieces, status, QC)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = jobUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get existing job
    const existingJob = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .findOne({ _id: new ObjectId(id) });

    if (!existingJob) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // For tailor role, only allow updating their own jobs
    const isTailor = session.user.role === 'tailor';
    const isManager = session.user.role === 'manager';
    if (isTailor) {
      if (existingJob.tailorId.toString() !== session.user.tailorId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to update this job' },
          { status: 403 }
        );
      }
      // Tailors can only update returnedPcs
      if (validation.data.status || validation.data.qcStatus) {
        return NextResponse.json(
          { success: false, error: 'Tailors can only update returned pieces' },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle tailor change
    if (validation.data.tailorId) {
      updateData.tailorId = new ObjectId(validation.data.tailorId);
    }

    // Handle issued pieces change
    if (validation.data.issuedPcs !== undefined) {
      updateData.issuedPcs = validation.data.issuedPcs;
    }

    // Handle rate change
    if (validation.data.rate !== undefined) {
      updateData.rate = validation.data.rate;
    }

    // Handle returned pieces
    const effectiveIssuedPcs = validation.data.issuedPcs ?? existingJob.issuedPcs;
    if (validation.data.returnedPcs !== undefined) {
      if (validation.data.returnedPcs > effectiveIssuedPcs) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot return more than issued (${effectiveIssuedPcs})`,
          },
          { status: 400 }
        );
      }
      updateData.returnedPcs = validation.data.returnedPcs;

      // Auto-update status if all pieces returned
      if (validation.data.returnedPcs === effectiveIssuedPcs) {
        updateData.status = 'completed';
        updateData.completedDate = new Date();
      }
    }

    if (validation.data.status) {
      updateData.status = validation.data.status;
      if (validation.data.status === 'completed') {
        updateData.completedDate = new Date();
      }
    }

    if (validation.data.qcStatus) {
      updateData.qcStatus = validation.data.qcStatus;
      if (validation.data.qcStatus === 'passed') {
        updateData.receivedDate = new Date();
      }
    }

    if (validation.data.qcNotes !== undefined) {
      updateData.qcNotes = validation.data.qcNotes;
    }

    // Tailor updates always require approval; manager updates also require approval
    if (isTailor || isManager) {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'tailorJob',
        entityId: new ObjectId(id),
        action: 'update',
        payload: {
          collection: COLLECTIONS.TAILOR_JOBS,
          type: 'update',
          data: updateData,
        },
        requestedBy: {
          userId: new ObjectId(session.user.id),
          name: session.user.name,
          role: session.user.role,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: true,
          data: { approvalId: approval.insertedId },
          message: 'Update submitted for approval',
        },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.TAILOR_JOBS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Job updated successfully',
    });
  } catch (error) {
    console.error('Tailor Job PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE tailor job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Check if job has returned pieces
    const job = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .findOne({ _id: new ObjectId(id) });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.returnedPcs > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete job with returned pieces' },
        { status: 400 }
      );
    }

    // Manager deletes require approval
    if (session.user.role === 'manager') {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'tailorJob',
        entityId: new ObjectId(id),
        action: 'delete',
        payload: {
          collection: COLLECTIONS.TAILOR_JOBS,
          type: 'delete',
          data: { jobInfo: `${job.styleId} - ${job.issuedPcs} pcs` },
        },
        requestedBy: {
          userId: new ObjectId(session.user.id),
          name: session.user.name,
          role: session.user.role,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: true,
          data: { approvalId: approval.insertedId },
          message: 'Deletion submitted for admin approval',
        },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.TAILOR_JOBS).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Tailor Job DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

