import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { rateSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET all rates
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
    const searchParams = request.nextUrl.searchParams;
    const styleId = searchParams.get('styleId');
    const vendorId = searchParams.get('vendorId');

    const query: Record<string, unknown> = {};
    if (styleId) query.styleId = new ObjectId(styleId);
    if (vendorId) query.vendorId = new ObjectId(vendorId);

    const rates = await db
      .collection(COLLECTIONS.RATES)
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
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        { $sort: { effectiveDate: -1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: rates });
  } catch (error) {
    console.error('Rates GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create or update rate
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
    const validation = rateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    // Upsert - update if exists for same style/vendor, else create
    const result = await db.collection(COLLECTIONS.RATES).findOneAndUpdate(
      {
        styleId: new ObjectId(validation.data.styleId),
        vendorId: new ObjectId(validation.data.vendorId),
      },
      {
        $set: {
          vendorRate: validation.data.vendorRate,
          effectiveDate: new Date(validation.data.effectiveDate),
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Rate saved successfully',
    });
  } catch (error) {
    console.error('Rates POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

