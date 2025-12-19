import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { qcInspectionSchema } from '@/lib/validations';

// List inspections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const styleId = searchParams.get('styleId');
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (styleId && ObjectId.isValid(styleId)) query.styleId = new ObjectId(styleId);
    if (jobId && ObjectId.isValid(jobId)) query.jobId = new ObjectId(jobId);
    if (status) query.status = status;

    const db = await getDb();
    const inspections = await db
      .collection(COLLECTIONS.QC_INSPECTIONS)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ success: true, data: inspections });
  } catch (error) {
    console.error('QC inspections GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Create inspection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = qcInspectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const result = await db.collection(COLLECTIONS.QC_INSPECTIONS).insertOne({
      ...validation.data,
      styleId: new ObjectId(validation.data.styleId),
      jobId: validation.data.jobId ? new ObjectId(validation.data.jobId) : undefined,
      checklistId: validation.data.checklistId ? new ObjectId(validation.data.checklistId) : undefined,
      reworkAssignedTo: validation.data.reworkAssignedTo
        ? new ObjectId(validation.data.reworkAssignedTo)
        : undefined,
      createdAt: now,
      updatedAt: now,
      inspectedBy: {
        userId: new ObjectId(session.user.id),
        name: session.user.name,
      },
    });

    return NextResponse.json(
      { success: true, data: { inspectionId: result.insertedId }, message: 'Inspection recorded' },
      { status: 201 }
    );
  } catch (error) {
    console.error('QC inspections POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

