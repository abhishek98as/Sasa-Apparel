import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getStartOfDay } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Get weekly capacity view for all tailors
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const weeksAhead = parseInt(searchParams.get('weeksAhead') || '1');

    const today = getStartOfDay(new Date());
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + weeksAhead * 7);

    // Get all active tailors with their capacity and skills
    const tailors = await db
      .collection('tailors')
      .find({ isActive: true })
      .toArray();

    // Get pending jobs per tailor
    const pendingJobs = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $match: {
            status: { $in: ['pending', 'in-progress'] },
          },
        },
        {
          $group: {
            _id: '$tailorId',
            pendingPcs: {
              $sum: {
                $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }],
              },
            },
            jobCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Calculate schedule data for each tailor
    const scheduleData = tailors.map((tailor) => {
      const pending = pendingJobs.find(
        (p) => p._id.toString() === tailor._id.toString()
      );
      const pendingPcs = pending?.pendingPcs || 0;
      const dailyCapacity = tailor.dailyCapacity || 50; // Default 50 pcs/day

      // Calculate days needed to complete pending work
      const daysNeeded = Math.ceil(pendingPcs / dailyCapacity);

      // Check for leaves in the upcoming period
      const upcomingLeaves =
        tailor.leaves?.filter((leave: { date: Date }) => {
          const leaveDate = new Date(leave.date);
          return leaveDate >= today && leaveDate <= endDate;
        }) || [];

      // Calculate available capacity
      const workingDays = weeksAhead * 7 - upcomingLeaves.length;
      const totalCapacity = workingDays * dailyCapacity;
      const availableCapacity = Math.max(0, totalCapacity - pendingPcs);

      // Workload indicator
      let workloadStatus: 'available' | 'moderate' | 'overloaded' = 'available';
      const utilizationRate = pendingPcs / totalCapacity;
      if (utilizationRate > 0.9) {
        workloadStatus = 'overloaded';
      } else if (utilizationRate > 0.6) {
        workloadStatus = 'moderate';
      }

      return {
        _id: tailor._id,
        name: tailor.name,
        phone: tailor.phone,
        skills: tailor.skills || [],
        dailyCapacity,
        pendingPcs,
        pendingJobs: pending?.jobCount || 0,
        daysNeeded,
        upcomingLeaves,
        totalCapacity,
        availableCapacity,
        workloadStatus,
        utilizationRate: Math.round(utilizationRate * 100),
      };
    });

    // Sort by available capacity (best options first)
    scheduleData.sort((a, b) => b.availableCapacity - a.availableCapacity);

    return NextResponse.json({
      success: true,
      data: {
        schedule: scheduleData,
        period: {
          start: today.toISOString(),
          end: endDate.toISOString(),
          weeks: weeksAhead,
        },
      },
    });
  } catch (error) {
    console.error('Tailor schedule GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

