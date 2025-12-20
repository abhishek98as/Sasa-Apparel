import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { inventoryMovementSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// Create a stock movement (in/out/waste/adjust)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = inventoryMovementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const itemId = new ObjectId(validation.data.itemId);
    const item = await db.collection(COLLECTIONS.INVENTORY_ITEMS).findOne({ _id: itemId });
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    const now = new Date();
    const quantity = validation.data.quantity;
    let delta = quantity;
    if (validation.data.type === 'out' || validation.data.type === 'waste') {
      delta = -quantity;
    }

    const newStock = (item.currentStock || 0) + delta;
    if (newStock < 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock for this movement' },
        { status: 400 }
      );
    }

    await db.collection(COLLECTIONS.INVENTORY_ITEMS).updateOne(
      { _id: itemId },
      { $set: { updatedAt: now }, $inc: { currentStock: delta } }
    );

    const movement = await db.collection(COLLECTIONS.INVENTORY_MOVEMENTS).insertOne({
      ...validation.data,
      itemId,
      unitCost: validation.data.unitCost ?? item.costPerUnit,
      createdAt: now,
      updatedAt: now,
      createdBy: {
        userId: new ObjectId(session.user.id),
        name: session.user.name,
        role: session.user.role,
      },
    });

    // Auto create reorder suggestion if below min stock
    const updatedItem = await db.collection(COLLECTIONS.INVENTORY_ITEMS).findOne({ _id: itemId });
    if (updatedItem && updatedItem.currentStock < updatedItem.minStock) {
      const existingOpen = await db.collection(COLLECTIONS.REORDER_SUGGESTIONS).findOne({
        itemId,
        status: { $in: ['open', 'acknowledged'] },
      });
      if (!existingOpen) {
        await db.collection(COLLECTIONS.REORDER_SUGGESTIONS).insertOne({
          itemId,
          suggestedQty: Math.max(updatedItem.minStock * 2 - updatedItem.currentStock, updatedItem.minStock),
          status: 'open',
          generatedReason: 'Stock below minimum threshold',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return NextResponse.json(
      { success: true, data: { movementId: movement.insertedId }, message: 'Stock movement recorded' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Inventory movement POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// List movements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type');

    const query: Record<string, unknown> = {};
    if (itemId && ObjectId.isValid(itemId)) query.itemId = new ObjectId(itemId);
    if (type) query.type = type;

    const db = await getDb();
    const movements = await db
      .collection(COLLECTIONS.INVENTORY_MOVEMENTS)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ success: true, data: movements });
  } catch (error) {
    console.error('Inventory movement GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

