/**
 * Style Linked Resources API
 * 
 * Returns linked resources (fabric types, cutting templates) for a style.
 * Used when creating cutting records to populate available options.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { createErrorResponse } from '@/lib/rbac';
import { ObjectId } from 'mongodb';

/**
 * GET /api/styles/[id]/linked-resources
 * Get fabric and cutting options based on selected style
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'Invalid style ID'),
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get style with vendor info
    const style = await db.collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } }
      ])
      .toArray();

    if (!style.length) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Style not found'),
        { status: 404 }
      );
    }

    const styleData = style[0];

    // Get available sizes
    const availableSizes = styleData.availableSizes || ['S', 'M', 'L', 'XL', 'XXL'];

    // Get linked fabric types or use default
    const linkedFabricTypes = styleData.linkedFabricTypes || [styleData.fabricType];

    // Get default size breakdown if exists
    const defaultSizeBreakdown = styleData.defaultSizeBreakdown || availableSizes.map((size: string) => ({
      size,
      quantity: 0
    }));

    // Get rate for this style
    const rate = await db.collection(COLLECTIONS.RATES).findOne({
      styleId: new ObjectId(id),
      vendorId: styleData.vendorId
    }, {
      sort: { effectiveDate: -1 }
    });

    // Check if any cutting records exist for this style
    const existingCuttings = await db.collection(COLLECTIONS.FABRIC_CUTTING)
      .find({ styleId: new ObjectId(id) })
      .sort({ date: -1 })
      .limit(3)
      .toArray();

    // Build response
    const linkedResources = {
      style: {
        id: styleData._id.toString(),
        code: styleData.code,
        name: styleData.name,
        fabricType: styleData.fabricType,
        description: styleData.description,
        images: styleData.images
      },
      vendor: styleData.vendor ? {
        id: styleData.vendor._id.toString(),
        name: styleData.vendor.name,
        contactPerson: styleData.vendor.contactPerson
      } : null,
      availableSizes,
      fabricOptions: linkedFabricTypes,
      defaultSizeBreakdown,
      currentRate: rate ? {
        vendorRate: rate.vendorRate,
        tailorRate: rate.tailorRate,
        effectiveDate: rate.effectiveDate
      } : null,
      recentCuttings: existingCuttings.map(c => ({
        id: c._id.toString(),
        date: c.date,
        fabricReceivedMeters: c.fabricReceivedMeters,
        cuttingReceivedPcs: c.cuttingReceivedPcs,
        sizeBreakdown: c.sizeBreakdown
      })),
      // If no fabric types linked, show CTA
      needsFabricLink: !styleData.linkedFabricTypes || styleData.linkedFabricTypes.length === 0
    };

    return NextResponse.json({
      success: true,
      data: linkedResources
    });

  } catch (error: any) {
    console.error('GET /api/styles/[id]/linked-resources error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to get linked resources'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/styles/[id]/linked-resources
 * Update linked fabric types and cutting templates for a style
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Admin or Manager access required'),
        { status: 403 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        createErrorResponse('BAD_REQUEST', 'Invalid style ID'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { linkedFabricTypes, defaultSizeBreakdown, availableSizes } = body;

    const db = await getDb();
    const now = new Date();

    // Verify style exists
    const style = await db.collection(COLLECTIONS.STYLES).findOne({
      _id: new ObjectId(id)
    });

    if (!style) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Style not found'),
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: now
    };

    if (linkedFabricTypes) {
      updateData.linkedFabricTypes = linkedFabricTypes;
    }

    if (defaultSizeBreakdown) {
      updateData.defaultSizeBreakdown = defaultSizeBreakdown;
    }

    if (availableSizes) {
      updateData.availableSizes = availableSizes;
    }

    await db.collection(COLLECTIONS.STYLES).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message: 'Style linked resources updated successfully'
    });

  } catch (error: any) {
    console.error('PATCH /api/styles/[id]/linked-resources error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to update linked resources'),
      { status: 500 }
    );
  }
}
