import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorId = searchParams.get('vendorId');
    const tailorId = searchParams.get('tailorId');

    const db = await getDb();
    const dateFilter: Record<string, unknown> = {};
    
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    let data: unknown = [];

    switch (reportType) {
      case 'production':
        // Style-wise production report
        data = await db
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
                      ...(Object.keys(dateFilter).length && { date: dateFilter }),
                    },
                  },
                ],
                as: 'cutting',
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
              $lookup: {
                from: COLLECTIONS.SHIPMENTS,
                let: { styleId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$styleId', '$$styleId'] },
                      ...(Object.keys(dateFilter).length && { date: dateFilter }),
                    },
                  },
                ],
                as: 'shipments',
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
            { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                styleCode: '$code',
                styleName: '$name',
                vendorName: '$vendor.name',
                fabricType: 1,
                totalReceived: { $sum: '$cutting.cuttingReceivedPcs' },
                totalFabricMeters: { $sum: '$cutting.fabricReceivedMeters' },
                inProduction: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$jobs',
                          cond: { $eq: ['$$this.status', 'in-progress'] },
                        },
                      },
                      in: { $subtract: ['$$this.issuedPcs', '$$this.returnedPcs'] },
                    },
                  },
                },
                completed: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$jobs',
                          cond: { $eq: ['$$this.status', 'completed'] },
                        },
                      },
                      in: '$$this.returnedPcs',
                    },
                  },
                },
                shipped: { $sum: '$shipments.pcsShipped' },
              },
            },
            { $sort: { styleName: 1 } },
          ])
          .toArray();
        break;

      case 'tailor':
        // Tailor performance report
        const tailorQuery: Record<string, unknown> = { isActive: true };
        if (tailorId) tailorQuery._id = new ObjectId(tailorId);

        data = await db
          .collection('tailors')
          .aggregate([
            { $match: tailorQuery },
            {
              $lookup: {
                from: COLLECTIONS.TAILOR_JOBS,
                let: { tailorId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$tailorId', '$$tailorId'] },
                      ...(Object.keys(dateFilter).length && { issueDate: dateFilter }),
                    },
                  },
                ],
                as: 'jobs',
              },
            },
            {
              $project: {
                tailorName: '$name',
                phone: 1,
                specialization: 1,
                totalJobs: { $size: '$jobs' },
                totalIssued: { $sum: '$jobs.issuedPcs' },
                totalReturned: { $sum: '$jobs.returnedPcs' },
                pending: {
                  $subtract: [
                    { $sum: '$jobs.issuedPcs' },
                    { $sum: '$jobs.returnedPcs' },
                  ],
                },
                totalEarnings: {
                  $sum: {
                    $map: {
                      input: '$jobs',
                      in: { $multiply: ['$$this.returnedPcs', '$$this.rate'] },
                    },
                  },
                },
                avgRate: { $avg: '$jobs.rate' },
                qcPassed: {
                  $size: {
                    $filter: {
                      input: '$jobs',
                      cond: { $eq: ['$$this.qcStatus', 'passed'] },
                    },
                  },
                },
                qcFailed: {
                  $size: {
                    $filter: {
                      input: '$jobs',
                      cond: { $eq: ['$$this.qcStatus', 'failed'] },
                    },
                  },
                },
              },
            },
            { $sort: { totalReturned: -1 } },
          ])
          .toArray();
        break;

      case 'shipment':
        // Vendor shipment report
        const shipmentQuery: Record<string, unknown> = {};
        if (vendorId) shipmentQuery.vendorId = new ObjectId(vendorId);
        if (Object.keys(dateFilter).length) shipmentQuery.date = dateFilter;

        data = await db
          .collection(COLLECTIONS.SHIPMENTS)
          .aggregate([
            { $match: shipmentQuery },
            {
              $lookup: {
                from: COLLECTIONS.VENDORS,
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendor',
              },
            },
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
                from: COLLECTIONS.RATES,
                let: { styleId: '$styleId', vendorId: '$vendorId' },
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
                  { $sort: { effectiveDate: -1 } },
                  { $limit: 1 },
                ],
                as: 'rate',
              },
            },
            { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$rate', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                date: 1,
                challanNo: 1,
                vendorName: '$vendor.name',
                styleCode: '$style.code',
                styleName: '$style.name',
                pcsShipped: 1,
                rate: '$rate.vendorRate',
                amount: {
                  $multiply: ['$pcsShipped', { $ifNull: ['$rate.vendorRate', 0] }],
                },
                notes: 1,
              },
            },
            { $sort: { date: -1 } },
          ])
          .toArray();
        break;

      case 'fabric':
        // Fabric utilization report
        const fabricQuery: Record<string, unknown> = {};
        if (vendorId) fabricQuery.vendorId = new ObjectId(vendorId);
        if (Object.keys(dateFilter).length) fabricQuery.date = dateFilter;

        data = await db
          .collection(COLLECTIONS.FABRIC_CUTTING)
          .aggregate([
            { $match: fabricQuery },
            {
              $lookup: {
                from: COLLECTIONS.VENDORS,
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendor',
              },
            },
            {
              $lookup: {
                from: COLLECTIONS.STYLES,
                localField: 'styleId',
                foreignField: '_id',
                as: 'style',
              },
            },
            { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                date: 1,
                vendorName: '$vendor.name',
                styleCode: '$style.code',
                styleName: '$style.name',
                fabricType: '$style.fabricType',
                fabricReceivedMeters: 1,
                cuttingReceivedPcs: 1,
                cuttingInHouse: 1,
                utilizationRate: {
                  $cond: {
                    if: { $gt: ['$fabricReceivedMeters', 0] },
                    then: {
                      $divide: ['$cuttingReceivedPcs', '$fabricReceivedMeters'],
                    },
                    else: 0,
                  },
                },
                notes: 1,
              },
            },
            { $sort: { date: -1 } },
          ])
          .toArray();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

