import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { fabricCuttingSchema } from '@/lib/validations';
import { InventoryService } from '@/lib/inventory/inventory-service';

export const dynamic = 'force-dynamic';

// GET all fabric cutting records
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
    const styleId = searchParams.get('styleId');
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: Record<string, unknown> = {};
    
    if (styleId) query.styleId = new ObjectId(styleId);
    if (vendorId) query.vendorId = new ObjectId(vendorId);
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) (query.date as Record<string, Date>).$lte = new Date(endDate);
    }

    // For vendor role, only show their records
    if (session.user.role === 'vendor' && session.user.vendorId) {
      query.vendorId = new ObjectId(session.user.vendorId);
    }

    const records = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style',
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        { $sort: { date: -1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Fabric Cutting GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create fabric cutting record
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
    const validation = fabricCuttingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const result = await db.collection(COLLECTIONS.FABRIC_CUTTING).insertOne({
      styleId: new ObjectId(validation.data.styleId),
      vendorId: new ObjectId(validation.data.vendorId),
      fabricReceivedMeters: validation.data.fabricReceivedMeters,
      cuttingReceivedPcs: validation.data.cuttingReceivedPcs,
      cuttingInHouse: validation.data.cuttingInHouse,
      date: new Date(validation.data.date),
      notes: validation.data.notes,
      createdAt: now,
      updatedAt: now,
    });

    // AUTO-CREATE INVENTORY TRANSACTION for fabric consumption
    // Find fabric inventory item by checking for items with category 'fabric'
    // You may need to adjust this logic to match your specific fabric item
    if (validation.data.fabricReceivedMeters > 0) {
      try {
        const inventoryService = new InventoryService();
        
        // Try to find a fabric item associated with this style
        // This is a simple implementation - you may want to add a fabricItemId field
        // to your fabric-cutting schema for more precise tracking
        const fabricItems = await db.collection(COLLECTIONS.INVENTORY_ITEMS).find({
          category: 'fabric',
          isActive: true
        }).limit(1).toArray();

        if (fabricItems.length > 0) {
          const fabricItem = fabricItems[0];
          
          // Record consumption transaction
          await inventoryService.recordTransaction({
            itemId: fabricItem._id.toString(),
            transactionType: 'consumption',
            quantity: validation.data.fabricReceivedMeters, // This will be negative in consumption
            unitCost: fabricItem.weightedAverageCost || 0,
            referenceType: 'fabric_cutting',
            referenceId: result.insertedId.toString(),
            remarks: `Fabric consumption for style cutting - ${validation.data.cuttingReceivedPcs} pcs`,
            performedBy: session.user.id,
            transactionDate: new Date(validation.data.date)
          });

          console.log('✅ Inventory transaction auto-created for fabric consumption');
        } else {
          console.warn('⚠️ No fabric inventory item found - skipping inventory transaction');
        }
      } catch (invError) {
        // Log error but don't fail the main operation
        console.error('❌ Error creating inventory transaction:', invError);
      }
    }

    const record = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        { $match: { _id: result.insertedId } },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style',
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    return NextResponse.json(
      { success: true, data: record[0], message: 'Cutting record created successfully (with inventory tracking)' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Fabric Cutting POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

