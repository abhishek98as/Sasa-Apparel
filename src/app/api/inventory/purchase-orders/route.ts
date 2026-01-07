import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { InventoryService } from '@/lib/inventory/inventory-service';

export const dynamic = 'force-dynamic';

// GET /api/inventory/purchase-orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) filter.status = status;

    const pos = await db
      .collection(COLLECTIONS.PURCHASE_ORDERS)
      .find(filter)
      .sort({ orderDate: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: pos });
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventory/purchase-orders
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();

    if (!body.supplier || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const inventoryService = new InventoryService();
    const poNumber = await inventoryService.generatePONumber();

    const totalAmount = body.items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitCost), 0
    );
    const gstAmount = totalAmount * 0.18; // 18% GST
    const grandTotal = totalAmount + gstAmount;

    const newPO = {
      poNumber,
      supplier: body.supplier,
      supplierContact: body.supplierContact || '',
      items: body.items,
      totalAmount,
      gstAmount,
      grandTotal,
      status: 'draft',
      orderDate: new Date(),
      expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : undefined,
      createdBy: new ObjectId(session.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTIONS.PURCHASE_ORDERS).insertOne(newPO);

    return NextResponse.json({
      success: true,
      message: 'Purchase order created',
      data: { _id: result.insertedId, ...newPO }
    });
  } catch (error: any) {
    console.error('Error creating PO:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

