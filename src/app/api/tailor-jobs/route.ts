import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { tailorJobSchema } from '@/lib/validations';

// GET all tailor jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const styleId = searchParams.get('styleId');
    const tailorId = searchParams.get('tailorId');
    const status = searchParams.get('status');
    const fabricCuttingId = searchParams.get('fabricCuttingId');

    const query: Record<string, unknown> = {};
    
    if (styleId) query.styleId = new ObjectId(styleId);
    if (tailorId) query.tailorId = new ObjectId(tailorId);
    if (status) query.status = status;
    if (fabricCuttingId) query.fabricCuttingId = new ObjectId(fabricCuttingId);

    // For tailor role, only show their jobs
    if (session.user.role === 'tailor' && session.user.tailorId) {
      query.tailorId = new ObjectId(session.user.tailorId);
    }

    const jobs = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: query },
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
        {
          $lookup: {
            from: COLLECTIONS.FABRIC_CUTTING,
            localField: 'fabricCuttingId',
            foreignField: '_id',
            as: 'fabricCutting',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$tailor', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$fabricCutting', preserveNullAndEmptyArrays: true } },
        { $sort: { issueDate: -1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Tailor Jobs GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create tailor job (assign work)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = tailorJobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify fabric cutting record exists and has available pieces
    const fabricCutting = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .findOne({ _id: new ObjectId(validation.data.fabricCuttingId) });

    if (!fabricCutting) {
      return NextResponse.json(
        { success: false, error: 'Fabric cutting record not found' },
        { status: 404 }
      );
    }

    // Calculate already assigned pieces
    const assignedPcs = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: { fabricCuttingId: new ObjectId(validation.data.fabricCuttingId) } },
        { $group: { _id: null, total: { $sum: '$issuedPcs' } } },
      ])
      .toArray();

    const totalAssigned = assignedPcs[0]?.total || 0;
    const available = fabricCutting.cuttingReceivedPcs - totalAssigned;

    if (validation.data.issuedPcs > available) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${available} pieces available. Already assigned: ${totalAssigned}`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await db.collection(COLLECTIONS.TAILOR_JOBS).insertOne({
      styleId: new ObjectId(validation.data.styleId),
      tailorId: new ObjectId(validation.data.tailorId),
      fabricCuttingId: new ObjectId(validation.data.fabricCuttingId),
      issuedPcs: validation.data.issuedPcs,
      rate: validation.data.rate,
      issueDate: now,
      status: 'in-progress',
      returnedPcs: 0,
      qcStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const job = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: { _id: result.insertedId } },
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

    return NextResponse.json(
      { success: true, data: job[0], message: 'Job assigned successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tailor Jobs POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

