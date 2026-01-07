import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// GET /api/inventory/stock-report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    // Get stock summary by category
    const stockByCategory = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: '$totalValue' }
          }
        }
      ])
      .toArray();

    // Get total inventory value
    const totalValue = stockByCategory.reduce((sum, cat) => sum + (cat.totalValue || 0), 0);

    // Get low stock items
    const lowStockItems = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$reorderLevel'] }
      })
      .sort({ currentStock: 1 })
      .toArray();

    // Get top items by value
    const topItemsByValue = await db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .find({ isActive: true })
      .sort({ totalValue: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        totalInventoryValue: totalValue,
        stockByCategory,
        lowStockItems,
        topItemsByValue
      }
    });
  } catch (error: any) {
    console.error('Error generating stock report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

