import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'tailor' || !session.user.tailorId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateFilter =
      startDate || endDate
        ? {
            ...(startDate ? { $gte: new Date(startDate) } : {}),
            ...(endDate ? { $lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
          }
        : undefined;

    const tailorId = new ObjectId(session.user.tailorId);
    const db = await getDb();

    // Get all jobs for this tailor
    const jobs = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: { tailorId, ...(dateFilter ? { issueDate: dateFilter } : {}) } },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $sort: { issueDate: -1 } },
      ])
      .toArray();

    // Calculate stats
    const stats = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'in-progress').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      totalIssued: jobs.reduce((sum, j) => sum + j.issuedPcs, 0),
      totalReturned: jobs.reduce((sum, j) => sum + j.returnedPcs, 0),
      pendingPcs: jobs.reduce((sum, j) => sum + (j.issuedPcs - j.returnedPcs), 0),
      totalEarnings: jobs.reduce((sum, j) => sum + j.returnedPcs * j.rate, 0),
    };

    // Active jobs
    const activeJobs = jobs.filter((j) => j.status === 'in-progress');

    // Recent completed
    const completedJobs = jobs
      .filter((j) => j.status === 'completed')
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        activeJobs,
        completedJobs,
      },
    });
  } catch (error) {
    console.error('Tailor Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

