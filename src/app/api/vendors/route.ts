import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { vendorSchema } from '@/lib/validations';

// GET all vendors
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
    const activeOnly = searchParams.get('active') === 'true';

    const query = activeOnly ? { isActive: true } : {};
    const vendors = await db
      .collection(COLLECTIONS.VENDORS)
      .find(query)
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Vendors GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create vendor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = vendorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const result = await db.collection(COLLECTIONS.VENDORS).insertOne({
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    });

    const vendor = await db.collection(COLLECTIONS.VENDORS).findOne({ _id: result.insertedId });

    return NextResponse.json(
      { success: true, data: vendor, message: 'Vendor created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Vendors POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

