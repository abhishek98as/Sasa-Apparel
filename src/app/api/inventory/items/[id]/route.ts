import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET /api/inventory/items/[id] - Get single item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const item = await db.collection(COLLECTIONS.INVENTORY_ITEMS).findOne({
      _id: new ObjectId(params.id)
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/items/[id] - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();

    const updateData: any = {
      updatedAt: new Date()
    };

    // Only update provided fields
    if (body.itemName) updateData.itemName = body.itemName;
    if (body.category) updateData.category = body.category;
    if (body.subCategory !== undefined) updateData.subCategory = body.subCategory;
    if (body.unit) updateData.unit = body.unit;
    if (body.reorderLevel !== undefined) updateData.reorderLevel = body.reorderLevel;
    if (body.maxStockLevel !== undefined) updateData.maxStockLevel = body.maxStockLevel;
    if (body.supplier !== undefined) updateData.supplier = body.supplier;
    if (body.specifications !== undefined) updateData.specifications = body.specifications;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const result = await db.collection(COLLECTIONS.INVENTORY_ITEMS).updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/items/[id] - Soft delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    
    // Soft delete by setting isActive = false
    const result = await db.collection(COLLECTIONS.INVENTORY_ITEMS).updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
