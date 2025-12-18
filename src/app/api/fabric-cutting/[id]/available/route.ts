import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// GET available pieces for a cutting record
export async function GET(
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
        { success: false, error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get cutting record
    const cutting = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .findOne({ _id: new ObjectId(id) });

    if (!cutting) {
      return NextResponse.json(
        { success: false, error: 'Cutting record not found' },
        { status: 404 }
      );
    }

    // Get assigned pieces
    const assigned = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: { fabricCuttingId: new ObjectId(id) } },
        {
          $group: {
            _id: null,
            totalIssued: { $sum: '$issuedPcs' },
            totalReturned: { $sum: '$returnedPcs' },
          },
        },
      ])
      .toArray();

    const totalReceived = cutting.cuttingReceivedPcs;
    const totalIssued = assigned[0]?.totalIssued || 0;
    const totalReturned = assigned[0]?.totalReturned || 0;
    const available = totalReceived - totalIssued;
    const inProduction = totalIssued - totalReturned;

    return NextResponse.json({
      success: true,
      data: {
        totalReceived,
        totalIssued,
        totalReturned,
        available,
        inProduction,
      },
    });
  } catch (error) {
    console.error('Available pieces GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

