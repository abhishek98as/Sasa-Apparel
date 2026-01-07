import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { InventoryService } from '@/lib/inventory/inventory-service';

export const dynamic = 'force-dynamic';

// GET /api/inventory/transactions - List transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    
    const itemId = searchParams.get('itemId');
    const transactionType = searchParams.get('transactionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    const filter: any = {};
    
    if (itemId) filter.itemId = new ObjectId(itemId);
    if (transactionType) filter.transactionType = transactionType;
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const transactions = await db
      .collection(COLLECTIONS.INVENTORY_TRANSACTIONS)
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: COLLECTIONS.INVENTORY_ITEMS,
            localField: 'itemId',
            foreignField: '_id',
            as: 'item'
          }
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            localField: 'performedBy',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $sort: { transactionDate: -1 } },
        { $limit: limit }
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/inventory/transactions - Record new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.itemId || !body.transactionType || !body.quantity || body.unitCost === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const inventoryService = new InventoryService();
    const result = await inventoryService.recordTransaction({
      itemId: body.itemId,
      transactionType: body.transactionType,
      quantity: body.quantity,
      unitCost: body.unitCost,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      remarks: body.remarks,
      performedBy: session.user.id,
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date()
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction recorded successfully',
      data: result.transaction
    });
  } catch (error: any) {
    console.error('Error recording transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record transaction' },
      { status: 500 }
    );
  }
}

