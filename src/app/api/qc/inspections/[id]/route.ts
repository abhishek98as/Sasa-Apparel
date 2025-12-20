import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { qcInspectionSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid inspection ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = qcInspectionSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const data = {
      ...validation.data,
      styleId: validation.data.styleId ? new ObjectId(validation.data.styleId) : undefined,
      jobId: validation.data.jobId ? new ObjectId(validation.data.jobId) : undefined,
      checklistId: validation.data.checklistId ? new ObjectId(validation.data.checklistId) : undefined,
      reworkAssignedTo: validation.data.reworkAssignedTo
        ? new ObjectId(validation.data.reworkAssignedTo)
        : undefined,
      updatedAt: new Date(),
    };

    if (session.user.role === 'manager') {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'qcInspection',
        entityId: new ObjectId(id),
        action: 'update',
        payload: {
          collection: COLLECTIONS.QC_INSPECTIONS,
          type: 'update',
          data,
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
        { success: true, data: { approvalId: approval.insertedId }, message: 'Update submitted for approval' },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.QC_INSPECTIONS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result, message: 'Inspection updated' });
  } catch (error) {
    console.error('QC inspection PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

