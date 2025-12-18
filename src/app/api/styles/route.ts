import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { styleSchema } from '@/lib/validations';

// GET all styles
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
    const activeOnly = searchParams.get('active') === 'true';

    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;
    
    // For vendor role, only show their styles
    if (session.user.role === 'vendor' && session.user.vendorId) {
      query.vendorId = new ObjectId(session.user.vendorId);
    } else if (vendorId) {
      query.vendorId = new ObjectId(vendorId);
    }

    const styles = await db
      .collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        { $sort: { code: 1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: styles });
  } catch (error) {
    console.error('Styles GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create style
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
    const validation = styleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if style code already exists
    const existing = await db
      .collection(COLLECTIONS.STYLES)
      .findOne({ code: validation.data.code });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Style code already exists' },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await db.collection(COLLECTIONS.STYLES).insertOne({
      ...validation.data,
      vendorId: new ObjectId(validation.data.vendorId),
      createdAt: now,
      updatedAt: now,
    });

    const style = await db.collection(COLLECTIONS.STYLES).findOne({ _id: result.insertedId });

    return NextResponse.json(
      { success: true, data: style, message: 'Style created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Styles POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

