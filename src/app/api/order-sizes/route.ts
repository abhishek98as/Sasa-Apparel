/**
 * Order Sizes API
 * 
 * Endpoints for managing size-level data for orders/styles.
 * Provides size breakdown tracking and distribution capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS, COMPLETED_STATUSES } from '@/lib/mongodb';
import { requirePermission, createErrorResponse } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { OrderSize, SizeBreakdown } from '@/lib/types';

/**
 * GET /api/order-sizes
 * Get size breakdown for a fabric cutting record
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fabricCuttingId = searchParams.get('fabricCuttingId');
    const styleId = searchParams.get('styleId');

    if (!fabricCuttingId && !styleId) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'fabricCuttingId or styleId is required'),
        { status: 400 }
      );
    }

    const db = await getDb();
    
    const filter: Record<string, unknown> = {};
    if (fabricCuttingId) filter.fabricCuttingId = new ObjectId(fabricCuttingId);
    if (styleId) filter.styleId = new ObjectId(styleId);

    const orderSizes = await db.collection(COLLECTIONS.ORDER_SIZES)
      .find(filter)
      .sort({ sizeLabel: 1 })
      .toArray();

    // Calculate computed fields
    const enrichedSizes = orderSizes.map(size => {
      const qty = size.qty || 0;
      const completedQty = size.completedQty || 0;
      const shippedQty = size.shippedQty || 0;
      const assignedQty = size.assignedToTailors?.reduce(
        (sum: number, a: { qty: number }) => sum + a.qty, 0
      ) || 0;

      return {
        ...size,
        _id: size._id?.toString(),
        styleId: size.styleId?.toString(),
        fabricCuttingId: size.fabricCuttingId?.toString(),
        qty,
        completedQty,
        shippedQty,
        pendingQty: qty - completedQty - shippedQty,
        availableForDistribution: qty - assignedQty
      };
    });

    // Calculate summary
    const summary = {
      totalQty: enrichedSizes.reduce((sum, s) => sum + s.qty, 0),
      totalCompleted: enrichedSizes.reduce((sum, s) => sum + s.completedQty, 0),
      totalShipped: enrichedSizes.reduce((sum, s) => sum + s.shippedQty, 0),
      totalPending: enrichedSizes.reduce((sum, s) => sum + s.pendingQty, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        sizes: enrichedSizes,
        summary
      }
    });

  } catch (error: any) {
    console.error('GET /api/order-sizes error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to fetch order sizes'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/order-sizes
 * Create or update size breakdown for a fabric cutting record
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requirePermission('cutting:create');
    
    const body = await request.json();
    const { fabricCuttingId, styleId, sizes } = body;

    if (!fabricCuttingId || !styleId || !Array.isArray(sizes)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'fabricCuttingId, styleId, and sizes array are required'),
        { status: 400 }
      );
    }

    // Validate sizes
    for (const size of sizes) {
      if (!size.sizeLabel || typeof size.qty !== 'number' || size.qty < 0) {
        return NextResponse.json(
          createErrorResponse('BAD_REQUEST', 'Each size must have sizeLabel and valid qty'),
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    const now = new Date();

    // Verify fabric cutting exists
    const fabricCutting = await db.collection(COLLECTIONS.FABRIC_CUTTING).findOne({
      _id: new ObjectId(fabricCuttingId)
    });

    if (!fabricCutting) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Fabric cutting record not found'),
        { status: 404 }
      );
    }

    // Upsert each size entry
    const operations = sizes.map((size: { sizeLabel: string; qty: number }) => ({
      updateOne: {
        filter: {
          fabricCuttingId: new ObjectId(fabricCuttingId),
          styleId: new ObjectId(styleId),
          sizeLabel: size.sizeLabel
        },
        update: {
          $set: {
            qty: size.qty,
            updatedAt: now
          },
          $setOnInsert: {
            fabricCuttingId: new ObjectId(fabricCuttingId),
            styleId: new ObjectId(styleId),
            sizeLabel: size.sizeLabel,
            completedQty: 0,
            shippedQty: 0,
            pendingQty: size.qty,
            assignedToTailors: [],
            createdAt: now
          }
        },
        upsert: true
      }
    }));

    await db.collection(COLLECTIONS.ORDER_SIZES).bulkWrite(operations);

    // Update fabric cutting with size breakdown
    const sizeBreakdown: SizeBreakdown[] = sizes.map((s: { sizeLabel: string; qty: number }) => ({
      size: s.sizeLabel,
      quantity: s.qty
    }));

    await db.collection(COLLECTIONS.FABRIC_CUTTING).updateOne(
      { _id: new ObjectId(fabricCuttingId) },
      { 
        $set: { 
          sizeBreakdown,
          updatedAt: now
        }
      }
    );

    // Audit log
    await createAuditLog({
      entityType: 'orderSize',
      entityId: fabricCuttingId,
      action: 'update',
      actorId: context.userId!,
      actorName: 'User', // Would get from session
      actorRole: context.role!,
      metadata: { sizesUpdated: sizes.length }
    });

    return NextResponse.json({
      success: true,
      message: 'Size breakdown updated successfully',
      data: { sizesUpdated: sizes.length }
    });

  } catch (error: any) {
    console.error('POST /api/order-sizes error:', error);
    
    if (error.name === 'AuthorizationError') {
      return NextResponse.json(
        createErrorResponse(error.code, error.message),
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to update order sizes'),
      { status: 500 }
    );
  }
}
