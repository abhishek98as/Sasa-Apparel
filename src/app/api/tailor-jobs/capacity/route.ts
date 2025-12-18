import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// GET tailor capacities for auto-suggestion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();

    // Get all active tailors with their current workload
    const tailorCapacities = await db
      .collection('tailors')
      .aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: COLLECTIONS.TAILOR_JOBS,
            let: { tailorId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$tailorId', '$$tailorId'] },
                  status: { $in: ['pending', 'in-progress'] },
                },
              },
              {
                $group: {
                  _id: null,
                  totalIssued: { $sum: '$issuedPcs' },
                  totalReturned: { $sum: '$returnedPcs' },
                },
              },
            ],
            as: 'workload',
          },
        },
        {
          $project: {
            tailorId: '$_id',
            tailorName: '$name',
            phone: 1,
            specialization: 1,
            totalIssued: {
              $ifNull: [{ $arrayElemAt: ['$workload.totalIssued', 0] }, 0],
            },
            totalReturned: {
              $ifNull: [{ $arrayElemAt: ['$workload.totalReturned', 0] }, 0],
            },
          },
        },
        {
          $addFields: {
            pendingPcs: { $subtract: ['$totalIssued', '$totalReturned'] },
            // Lower pending = higher available capacity
            // Sort by pending ascending to suggest tailors with less work first
          },
        },
        { $sort: { pendingPcs: 1, tailorName: 1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: tailorCapacities });
  } catch (error) {
    console.error('Tailor Capacity GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

