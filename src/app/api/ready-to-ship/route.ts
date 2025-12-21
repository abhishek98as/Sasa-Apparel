import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// GET ready-to-ship items (completed and QC passed but not yet shipped)
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

    // Aggregate jobs by style and vendor to get ready-to-ship quantities
    const readyItems = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $match: {
            qcStatus: 'passed',
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
        { $unwind: '$style' },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'style.vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              styleId: '$styleId',
              vendorId: '$style.vendorId',
            },
            styleId: { $first: '$styleId' },
            vendorId: { $first: '$style.vendorId' },
            style: { $first: '$style' },
            vendor: { $first: '$vendor' },
            completedPcs: { $sum: '$returnedPcs' },
            qcPassedPcs: { $sum: '$returnedPcs' },
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.SHIPMENTS,
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
              {
                $group: {
                  _id: null,
                  totalShipped: { $sum: '$pcsShipped' },
                },
              },
            ],
            as: 'shipmentData',
          },
        },
        {
          $addFields: {
            shippedPcs: {
              $ifNull: [{ $arrayElemAt: ['$shipmentData.totalShipped', 0] }, 0],
            },
          },
        },
        {
          $addFields: {
            readyToShipPcs: { $subtract: ['$qcPassedPcs', '$shippedPcs'] },
          },
        },
        {
          $match: {
            readyToShipPcs: { $gt: 0 },
          },
        },
        {
          $project: {
            _id: { $concat: [{ $toString: '$styleId' }, '-', { $toString: '$vendorId' }] },
            styleId: 1,
            vendorId: 1,
            style: { _id: '$style._id', code: '$style.code', name: '$style.name' },
            vendor: { _id: '$vendor._id', name: '$vendor.name' },
            completedPcs: 1,
            qcPassedPcs: 1,
            shippedPcs: 1,
            readyToShipPcs: 1,
          },
        },
        { $sort: { readyToShipPcs: -1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: readyItems });
  } catch (error) {
    console.error('Ready to Ship GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

