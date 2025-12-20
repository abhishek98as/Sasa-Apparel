import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'monthly'; // weekly, monthly, yearly

    const now = new Date();
    const periods: Date[] = [];

    // Generate date ranges based on period
    if (period === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        periods.push(d);
      }
    } else if (period === 'monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        periods.push(d);
      }
    } else {
      // Last 3 years
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - i);
        periods.push(d);
      }
    }

    // Production efficiency trends (cutting received vs completed vs shipped)
    const productionTrends = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        {
          $group: {
            _id: period === 'yearly'
              ? { year: { $year: '$date' } }
              : period === 'monthly'
              ? { year: { $year: '$date' }, month: { $month: '$date' } }
              : { year: { $year: '$date' }, week: { $week: '$date' } },
            received: { $sum: '$cuttingReceivedPcs' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
        { $limit: 12 },
      ])
      .toArray();

    const completionTrends = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: period === 'yearly'
              ? { year: { $year: '$returnDate' } }
              : period === 'monthly'
              ? { year: { $year: '$returnDate' }, month: { $month: '$returnDate' } }
              : { year: { $year: '$returnDate' }, week: { $week: '$returnDate' } },
            completed: { $sum: '$returnedPcs' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
        { $limit: 12 },
      ])
      .toArray();

    const shipmentTrends = await db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        {
          $group: {
            _id: period === 'yearly'
              ? { year: { $year: '$date' } }
              : period === 'monthly'
              ? { year: { $year: '$date' }, month: { $month: '$date' } }
              : { year: { $year: '$date' }, week: { $week: '$date' } },
            shipped: { $sum: '$pcsShipped' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
        { $limit: 12 },
      ])
      .toArray();

    // Tailor performance comparison
    const tailorPerformance = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $lookup: {
            from: 'tailors',
            localField: 'tailorId',
            foreignField: '_id',
            as: 'tailor',
          },
        },
        { $unwind: { path: '$tailor', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$tailorId',
            tailorName: { $first: '$tailor.name' },
            totalIssued: { $sum: '$issuedPcs' },
            totalReturned: { $sum: '$returnedPcs' },
            totalEarnings: {
              $sum: { $multiply: ['$returnedPcs', '$rate'] },
            },
            jobCount: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            avgTurnaround: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ['$returnDate', null] }, { $ne: ['$issueDate', null] }] },
                  {
                    $divide: [
                      { $subtract: ['$returnDate', '$issueDate'] },
                      86400000, // Convert ms to days
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            tailorName: 1,
            totalReturned: 1,
            totalEarnings: 1,
            jobCount: 1,
            completionRate: {
              $cond: [
                { $gt: ['$jobCount', 0] },
                { $multiply: [{ $divide: ['$completedJobs', '$jobCount'] }, 100] },
                0,
              ],
            },
            avgTurnaround: { $round: ['$avgTurnaround', 1] },
            pendingPcs: { $subtract: ['$totalIssued', '$totalReturned'] },
          },
        },
        { $sort: { totalReturned: -1 } },
        { $limit: 15 },
      ])
      .toArray();

    // Style-wise profitability (revenue from vendor rate - tailor cost)
    const styleProfitability = await db
      .collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: COLLECTIONS.RATES,
            localField: '_id',
            foreignField: 'styleId',
            as: 'rate',
          },
        },
        { $unwind: { path: '$rate', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: COLLECTIONS.SHIPMENTS,
            localField: '_id',
            foreignField: 'styleId',
            as: 'shipments',
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.TAILOR_JOBS,
            localField: '_id',
            foreignField: 'styleId',
            as: 'jobs',
          },
        },
        {
          $project: {
            styleName: '$name',
            styleCode: '$code',
            vendorRate: { $ifNull: ['$rate.vendorRate', 0] },
            tailorRate: { $ifNull: ['$rate.tailorRate', 0] },
            totalShipped: { $sum: '$shipments.pcsShipped' },
            totalReturned: { $sum: '$jobs.returnedPcs' },
            revenue: {
              $multiply: [
                { $sum: '$shipments.pcsShipped' },
                { $ifNull: ['$rate.vendorRate', 0] },
              ],
            },
            tailorCost: {
              $sum: {
                $map: {
                  input: '$jobs',
                  in: { $multiply: ['$$this.returnedPcs', '$$this.rate'] },
                },
              },
            },
          },
        },
        {
          $addFields: {
            profit: { $subtract: ['$revenue', '$tailorCost'] },
            profitMargin: {
              $cond: [
                { $gt: ['$revenue', 0] },
                {
                  $multiply: [
                    { $divide: [{ $subtract: ['$revenue', '$tailorCost'] }, '$revenue'] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { profit: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    // Vendor delivery timeline analysis
    const vendorAnalysis = await db
      .collection(COLLECTIONS.VENDORS)
      .aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: COLLECTIONS.FABRIC_CUTTING,
            localField: '_id',
            foreignField: 'vendorId',
            as: 'cutting',
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.SHIPMENTS,
            localField: '_id',
            foreignField: 'vendorId',
            as: 'shipments',
          },
        },
        {
          $project: {
            vendorName: '$name',
            totalCuttingReceived: { $sum: '$cutting.cuttingReceivedPcs' },
            totalShipped: { $sum: '$shipments.pcsShipped' },
            shipmentCount: { $size: '$shipments' },
            avgDeliveryDays: {
              $avg: {
                $map: {
                  input: '$shipments',
                  in: {
                    $divide: [
                      { $subtract: ['$$this.createdAt', '$$this.date'] },
                      86400000,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            pendingPcs: { $subtract: ['$totalCuttingReceived', '$totalShipped'] },
            fulfillmentRate: {
              $cond: [
                { $gt: ['$totalCuttingReceived', 0] },
                {
                  $multiply: [
                    { $divide: ['$totalShipped', '$totalCuttingReceived'] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { totalShipped: -1 } },
      ])
      .toArray();

    // QC pass rate by style
    const qcAnalysis = await db
      .collection(COLLECTIONS.QC_INSPECTIONS)
      .aggregate([
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$styleId',
            styleName: { $first: '$style.name' },
            total: { $sum: 1 },
            passed: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            rework: { $sum: { $cond: [{ $eq: ['$status', 'rework'] }, 1, 0] } },
          },
        },
        {
          $addFields: {
            passRate: {
              $cond: [
                { $gt: ['$total', 0] },
                { $multiply: [{ $divide: ['$passed', '$total'] }, 100] },
                0,
              ],
            },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 15 },
      ])
      .toArray();

    // Format trend data for charts
    const formatPeriodLabel = (id: { year?: number; month?: number; week?: number }) => {
      if (period === 'yearly') {
        return `${id.year}`;
      } else if (period === 'monthly') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[(id.month || 1) - 1]} ${id.year}`;
      } else {
        return `W${id.week} ${id.year}`;
      }
    };

    const efficiencyTrends = productionTrends.map((pt) => {
      const label = formatPeriodLabel(pt._id);
      const completion = completionTrends.find(
        (c) =>
          c._id.year === pt._id.year &&
          c._id.month === pt._id.month &&
          c._id.week === pt._id.week
      );
      const shipment = shipmentTrends.find(
        (s) =>
          s._id.year === pt._id.year &&
          s._id.month === pt._id.month &&
          s._id.week === pt._id.week
      );

      return {
        period: label,
        received: pt.received || 0,
        completed: completion?.completed || 0,
        shipped: shipment?.shipped || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        efficiencyTrends,
        tailorPerformance,
        styleProfitability,
        vendorAnalysis,
        qcAnalysis,
        period,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

