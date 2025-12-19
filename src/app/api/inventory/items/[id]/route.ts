import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { inventoryItemSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid item ID' }, { status: 400 });
    }

    const db = await getDb();
    const item = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Inventory item GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = inventoryItemSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const data = {
      ...validation.data,
      vendorId: validation.data.vendorId ? new ObjectId(validation.data.vendorId) : undefined,
      updatedAt: new Date(),
    };

    // Managers require admin approval
    if (session.user.role === 'manager') {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'inventoryItem',
        entityId: new ObjectId(id),
        action: 'update',
        payload: {
          collection: COLLECTIONS.INVENTORY_ITEMS,
          type: 'update',
          data,
        },
        requestedBy: {
          userId: new ObjectId(session.user.id),
          name: session.user.name,
          role: session.user.role,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, data: { approvalId: approval.insertedId }, message: 'Update submitted for approval' },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.INVENTORY_ITEMS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Inventory item PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid item ID' }, { status: 400 });
    }

    const db = await getDb();

    if (session.user.role === 'manager') {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'inventoryItem',
        entityId: new ObjectId(id),
        action: 'delete',
        payload: {
          collection: COLLECTIONS.INVENTORY_ITEMS,
          type: 'softDelete',
        },
        requestedBy: {
          userId: new ObjectId(session.user.id),
          name: session.user.name,
          role: session.user.role,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { success: true, data: { approvalId: approval.insertedId }, message: 'Deletion submitted for approval' },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.INVENTORY_ITEMS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item deactivated successfully' });
  } catch (error) {
    console.error('Inventory item DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

