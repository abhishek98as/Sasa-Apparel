import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'vendor' || !session.user.vendorId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vendorId = new ObjectId(session.user.vendorId);
    const db = await getDb();

    // Get vendor's styles with production status
    const stylesData = await db
      .collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: { vendorId, isActive: true } },
        // Get cutting records
        {
          $lookup: {
            from: COLLECTIONS.FABRIC_CUTTING,
            localField: '_id',
            foreignField: 'styleId',
            as: 'cutting',
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
        {
          $project: {
            code: 1,
            name: 1,
            fabricType: 1,
            totalReceived: { $sum: '$cutting.cuttingReceivedPcs' },
            totalShipped: { $sum: '$shipments.pcsShipped' },
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
                      cond: { $eq: ['$$this.qcStatus', 'passed'] },
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
            pending: { $subtract: ['$totalReceived', '$totalShipped'] },
          },
        },
      ])
      .toArray();

    // Get recent shipments
    const recentShipments = await db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        { $match: { vendorId } },
        { $sort: { date: -1 } },
        { $limit: 10 },
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
            date: 1,
            challanNo: 1,
            pcsShipped: 1,
            styleName: '$style.name',
            styleCode: '$style.code',
          },
        },
      ])
      .toArray();

    // Summary totals
    const totals = stylesData.reduce(
      (acc, s) => ({
        totalReceived: acc.totalReceived + (s.totalReceived || 0),
        totalShipped: acc.totalShipped + (s.totalShipped || 0),
        inProduction: acc.inProduction + (s.inProduction || 0),
        pending: acc.pending + (s.pending || 0),
      }),
      { totalReceived: 0, totalShipped: 0, inProduction: 0, pending: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        styles: stylesData,
        recentShipments,
        totals,
      },
    });
  } catch (error) {
    console.error('Vendor Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

