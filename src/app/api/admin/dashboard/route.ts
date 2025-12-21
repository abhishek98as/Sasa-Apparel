import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getStartOfDay, getEndOfDay, getStartOfMonth, getEndOfMonth } from '@/lib/utils';

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
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const today = new Date();
    const startOfToday = getStartOfDay(today);
    const endOfToday = getEndOfDay(today);
    const startOfMonth = getStartOfMonth(today);
    const endOfMonth = getEndOfMonth(today);

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? getEndOfDay(new Date(endDateParam)) : undefined;

    const dateFilter =
      startDate || endDate
        ? {
          ...(startDate ? { $gte: startDate } : {}),
          ...(endDate ? { $lte: endDate } : {}),
        }
        : undefined;

    const rangeLabel = startDate || endDate ? 'Filtered range' : 'All time';

    // Get cutting received today
    const cuttingToday = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        {
          $match: {
            ...(dateFilter ? { date: dateFilter } : { date: { $gte: startOfToday, $lte: endOfToday } }),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$cuttingReceivedPcs' },
          },
        },
      ])
      .toArray();

    // Get cutting received this month
    const cuttingMonth = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        {
          $match: {
            ...(dateFilter ? { date: dateFilter } : { date: { $gte: startOfMonth, $lte: endOfMonth } }),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$cuttingReceivedPcs' },
          },
        },
      ])
      .toArray();

    // Get tailor job stats
    const tailorJobStats = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        ...(dateFilter ? [{ $match: { issueDate: dateFilter } }] : []),
        {
          $group: {
            _id: null,
            totalIssued: { $sum: '$issuedPcs' },
            totalReturned: { $sum: '$returnedPcs' },
            totalCost: {
              $sum: { $multiply: ['$returnedPcs', '$rate'] },
            },
            inProgress: {
              $sum: {
                $cond: [{ $eq: ['$status', 'in-progress'] }, '$issuedPcs', 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$qcStatus', 'passed'] }, '$returnedPcs', 0],
              },
            },
          },
        },
      ])
      .toArray();

    // Get shipment stats
    const shipmentStats = await db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        ...(dateFilter ? [{ $match: { date: dateFilter } }] : []),
        {
          $group: {
            _id: null,
            totalShipped: { $sum: '$pcsShipped' },
          },
        },
      ])
      .toArray();

    // Calculate expected receivable (completed pcs * vendor rate)
    // Formula: Sum(returnedPcs where qcStatus='passed' * vendorRate)
    const receivableData = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $match: {
            qcStatus: 'passed',
            ...(dateFilter ? { completedDate: dateFilter } : {})
          }
        },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style',
          },
        },
        { $unwind: '$style' },
        {
          $lookup: {
            from: COLLECTIONS.RATES,
            let: { styleId: '$style._id', vendorId: '$style.vendorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$styleId', '$$styleId'] },
                      { $eq: ['$vendorId', '$$vendorId'] },
                    ],
                  },
                },
              },
            ],
            as: 'rate',
          },
        },
        {
          $unwind: { path: '$rate', preserveNullAndEmptyArrays: true },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: ['$returnedPcs', { $ifNull: ['$rate.vendorRate', 0] }],
              },
            },
          },
        },
      ])
      .toArray();

    // Count entities
    const [vendorCount, styleCount, tailorCount] = await Promise.all([
      db.collection(COLLECTIONS.VENDORS).countDocuments({ isActive: true }),
      db.collection(COLLECTIONS.STYLES).countDocuments({ isActive: true }),
      db.collection('tailors').countDocuments({ isActive: true }),
    ]);

    // Get style-wise data
    const styleWiseData = await db
      .collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: COLLECTIONS.FABRIC_CUTTING,
            let: { styleId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$styleId', '$$styleId'] },
                  ...(dateFilter ? { date: dateFilter } : {}),
                },
              },
            ],
            as: 'cutting',
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.TAILOR_JOBS,
            let: { styleId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$styleId', '$$styleId'] },
                  ...(dateFilter ? { issueDate: dateFilter } : {}),
                },
              },
            ],
            as: 'jobs',
          },
        },
        {
          $project: {
            styleName: '$name',
            received: { $sum: '$cutting.cuttingReceivedPcs' },
            inProgress: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$jobs',
                      cond: { $eq: ['$$this.status', 'in-progress'] },
                    },
                  },
                  in: '$$this.issuedPcs',
                },
              },
            },
            completed: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$jobs',
                      cond: { $eq: ['$$this.qcStatus', 'passed'] },
                    },
                  },
                  in: '$$this.returnedPcs',
                },
              },
            },
          },
        },
        { $limit: 10 },
      ])
      .toArray();

    // Get recent activity (combining cutting, shipments, job completions)
    const recentCutting = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        ...(dateFilter ? [{ $match: { date: dateFilter } }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
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
          $project: {
            type: { $literal: 'cutting' },
            description: {
              $concat: [
                'Received ',
                { $toString: '$cuttingReceivedPcs' },
                ' pcs of ',
                { $ifNull: ['$style.name', 'Unknown Style'] },
              ],
            },
            date: '$createdAt',
          },
        },
      ])
      .toArray();

    const recentShipments = await db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        ...(dateFilter ? [{ $match: { date: dateFilter } }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
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
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            type: { $literal: 'shipment' },
            description: {
              $concat: [
                'Shipped ',
                { $toString: '$pcsShipped' },
                ' pcs to ',
                { $ifNull: ['$vendor.name', 'Unknown Vendor'] },
              ],
            },
            date: '$createdAt',
          },
        },
      ])
      .toArray();

    const recentActivity = [...recentCutting, ...recentShipments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const jobStats = tailorJobStats[0] || {
      totalIssued: 0,
      totalReturned: 0,
      totalCost: 0,
      inProgress: 0,
      completed: 0,
    };

    const metrics = {
      totalCuttingReceivedToday: cuttingToday[0]?.total || 0,
      totalCuttingReceivedMonth: cuttingMonth[0]?.total || 0,
      cuttingInProduction: jobStats.inProgress,
      pcsCompleted: jobStats.completed,
      pcsShipped: shipmentStats[0]?.totalShipped || 0,
      expectedReceivable: receivableData[0]?.total || 0,
      totalTailoringExpense: jobStats.totalCost,
      pendingFromTailors: jobStats.totalIssued - jobStats.totalReturned,
      totalVendors: vendorCount,
      totalStyles: styleCount,
      activeTailors: tailorCount,
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        styleWiseData,
        recentActivity,
        range: {
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
          label: rangeLabel,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

