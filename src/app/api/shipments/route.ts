import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { shipmentSchema } from '@/lib/validations';

// GET all shipments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const vendorId = searchParams.get('vendorId');
    const styleId = searchParams.get('styleId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: Record<string, unknown> = {};
    
    // For vendor role, only show their shipments
    if (session.user.role === 'vendor' && session.user.vendorId) {
      query.vendorId = new ObjectId(session.user.vendorId);
    } else if (vendorId) {
      query.vendorId = new ObjectId(vendorId);
    }

    if (styleId) query.styleId = new ObjectId(styleId);

    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) (query.date as Record<string, Date>).$lte = new Date(endDate);
    }

    const shipments = await db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        { $match: query },
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
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$rate', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            amount: {
              $multiply: ['$pcsShipped', { $ifNull: ['$rate.vendorRate', 0] }],
            },
          },
        },
        { $sort: { date: -1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: shipments });
  } catch (error) {
    console.error('Shipments GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create shipment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = shipmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const result = await db.collection(COLLECTIONS.SHIPMENTS).insertOne({
      vendorId: new ObjectId(validation.data.vendorId),
      styleId: new ObjectId(validation.data.styleId),
      pcsShipped: validation.data.pcsShipped,
      date: new Date(validation.data.date),
      challanNo: validation.data.challanNo,
      notes: validation.data.notes,
      createdAt: now,
      updatedAt: now,
    });

    const shipment = await db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        { $match: { _id: result.insertedId } },
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
      ])
      .toArray();

    return NextResponse.json(
      { success: true, data: shipment[0], message: 'Shipment created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Shipments POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

