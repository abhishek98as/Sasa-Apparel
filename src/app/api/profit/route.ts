import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// GET profit analytics
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

    // Get style-wise profit breakdown
    const styleWiseProfit = await db
      .collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: { isActive: true } },
        // Get rates
        {
          $lookup: {
            from: COLLECTIONS.RATES,
            localField: '_id',
            foreignField: 'styleId',
            as: 'rates',
          },
        },
        // Get shipments
        {
          $lookup: {
            from: COLLECTIONS.SHIPMENTS,
            localField: '_id',
            foreignField: 'styleId',
            as: 'shipments',
          },
        },
        // Get tailor jobs
        {
          $lookup: {
            from: COLLECTIONS.TAILOR_JOBS,
            localField: '_id',
            foreignField: 'styleId',
            as: 'jobs',
          },
        },
        // Get vendor
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
            vendorRate: { $arrayElemAt: ['$rates.vendorRate', 0] },
            totalShipped: { $sum: '$shipments.pcsShipped' },
            totalTailoringCost: {
              $sum: {
                $map: {
                  input: '$jobs',
                  in: { $multiply: ['$$this.returnedPcs', '$$this.rate'] },
                },
              },
            },
            pcsCompleted: {
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
          },
        },
        {
          $addFields: {
            expectedRevenue: {
              $multiply: ['$totalShipped', { $ifNull: ['$vendorRate', 0] }],
            },
            grossMargin: {
              $subtract: [
                { $multiply: ['$totalShipped', { $ifNull: ['$vendorRate', 0] }] },
                '$totalTailoringCost',
              ],
            },
          },
        },
        { $sort: { styleName: 1 } },
      ])
      .toArray();

    // Summary totals
    const totals = styleWiseProfit.reduce(
      (acc, s) => ({
        totalShipped: acc.totalShipped + (s.totalShipped || 0),
        totalRevenue: acc.totalRevenue + (s.expectedRevenue || 0),
        totalTailoringCost: acc.totalTailoringCost + (s.totalTailoringCost || 0),
        totalMargin: acc.totalMargin + (s.grossMargin || 0),
      }),
      { totalShipped: 0, totalRevenue: 0, totalTailoringCost: 0, totalMargin: 0 }
    );

    // Vendor-wise breakdown
    const vendorWiseData = await db
      .collection(COLLECTIONS.VENDORS)
      .aggregate([
        { $match: { isActive: true } },
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
            totalShipped: { $sum: '$shipments.pcsShipped' },
            shipmentCount: { $size: '$shipments' },
          },
        },
        { $sort: { totalShipped: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        styleWiseProfit,
        vendorWiseData,
        totals,
      },
    });
  } catch (error) {
    console.error('Profit GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

