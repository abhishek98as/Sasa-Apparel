import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET /api/inventory/items - List all inventory items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');

    const filter: any = {};
    
    if (category) filter.category = category;
    if (active !== null) filter.isActive = active === 'true';
    if (search) {
      filter.$or = [
        { itemCode: { $regex: search, $options: 'i' } },
        { itemName: { $regex: search, $options: 'i' } }
      ];
    }
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
    }

    const items = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .find(filter)
      .sort({ itemName: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST /api/inventory/items - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();

    // Validate required fields
    if (!body.itemCode || !body.itemName || !body.category || !body.unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if item code already exists
    const existing = await db.collection(COLLECTIONS.INVENTORY_ITEMS).findOne({
      itemCode: body.itemCode
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Item code already exists' },
        { status: 400 }
      );
    }

    const newItem = {
      itemCode: body.itemCode,
      itemName: body.itemName,
      category: body.category,
      subCategory: body.subCategory || '',
      unit: body.unit,
      currentStock: body.currentStock || 0,
      weightedAverageCost: body.weightedAverageCost || 0,
      totalValue: (body.currentStock || 0) * (body.weightedAverageCost || 0),
      reorderLevel: body.reorderLevel || 0,
      maxStockLevel: body.maxStockLevel || 0,
      supplier: body.supplier || '',
      specifications: body.specifications || {},
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTIONS.INVENTORY_ITEMS).insertOne(newItem);

    return NextResponse.json({
      success: true,
      message: 'Inventory item created successfully',
      data: { _id: result.insertedId, ...newItem }
    });
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create item' },
      { status: 500 }
    );
  }
}
