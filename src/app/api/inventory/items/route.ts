import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { inventoryItemSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// List inventory items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const q = searchParams.get('q');
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const query: Record<string, unknown> = {};
    if (type) query.type = type;
    if (q) query.name = { $regex: q, $options: 'i' };
    if (lowStockOnly) query.$expr = { $lt: ['$currentStock', '$minStock'] };

    const db = await getDb();
    const items = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .find(query)
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Inventory items GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Create inventory item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = inventoryItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();
    const data = {
      ...validation.data,
      vendorId: validation.data.vendorId ? new ObjectId(validation.data.vendorId) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const existingSku = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .findOne({ sku: validation.data.sku });
    if (existingSku) {
      return NextResponse.json(
        { success: false, error: 'SKU already exists' },
        { status: 400 }
      );
    }

    const result = await db.collection(COLLECTIONS.INVENTORY_ITEMS).insertOne(data);
    const item = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .findOne({ _id: result.insertedId });

    return NextResponse.json(
      { success: true, data: item, message: 'Item created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Inventory items POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

