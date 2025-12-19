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

    const styleId = new ObjectId(validation.data.styleId);
    const reworkTailorId = validation.data.reworkAssignedTo
      ? new ObjectId(validation.data.reworkAssignedTo)
      : undefined;

    // Create the inspection record
    const result = await db.collection(COLLECTIONS.QC_INSPECTIONS).insertOne({
      ...validation.data,
      styleId,
      jobId: validation.data.jobId ? new ObjectId(validation.data.jobId) : undefined,
      checklistId: validation.data.checklistId ? new ObjectId(validation.data.checklistId) : undefined,
      reworkAssignedTo: reworkTailorId,
      createdAt: now,
      updatedAt: now,
      inspectedBy: {
        userId: new ObjectId(session.user.id),
        name: session.user.name,
      },
    });

    let reworkJobId = null;

    // If status is "rework" and a tailor is assigned, create a rework job in Production
    if (validation.data.status === 'rework' && reworkTailorId) {
      // Get the style to find a default rate
      const style = await db.collection(COLLECTIONS.STYLES).findOne({ _id: styleId });
      
      // Get the rate for this style (use tailor rate or default)
      const rateDoc = await db.collection(COLLECTIONS.RATES).findOne({ styleId });
      const rate = rateDoc?.tailorRate || 0;

      // Get defect count for rework pieces estimation (default to 1 if not specified)
      const reworkPcs = body.reworkPcs || 1;

      // Create a rework job - this will show in Production page
      const reworkJob = await db.collection(COLLECTIONS.TAILOR_JOBS).insertOne({
        styleId,
        tailorId: reworkTailorId,
        fabricCuttingId: null, // Rework jobs don't need a cutting record
        issuedPcs: reworkPcs,
        rate,
        issueDate: now,
        status: 'in-progress', // Rework is immediately in progress
        returnedPcs: 0,
        qcStatus: 'rework', // Mark as rework for tracking
        qcNotes: validation.data.rejectionReason || 'Rework from QC inspection',
        isRework: true, // Flag to identify rework jobs
        sourceInspectionId: result.insertedId,
        createdAt: now,
        updatedAt: now,
      });

      reworkJobId = reworkJob.insertedId;
    }

    // If the original job is linked, update its qcStatus
    if (validation.data.jobId) {
      await db.collection(COLLECTIONS.TAILOR_JOBS).updateOne(
        { _id: new ObjectId(validation.data.jobId) },
        {
          $set: {
            qcStatus: validation.data.status,
            qcNotes: validation.data.rejectionReason,
            updatedAt: now,
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          inspectionId: result.insertedId,
          reworkJobId,
        },
        message: reworkJobId
          ? 'Inspection recorded and rework job created'
          : 'Inspection recorded',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('QC inspections POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

