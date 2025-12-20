import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { styleSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET single style
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid style ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const style = await db
      .collection(COLLECTIONS.STYLES)
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    if (!style.length) {
      return NextResponse.json(
        { success: false, error: 'Style not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: style[0] });
  } catch (error) {
    console.error('Style GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update style
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid style ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = styleSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const updateData: Record<string, unknown> = {
      ...validation.data,
      updatedAt: new Date(),
    };

    if (validation.data.vendorId) {
      updateData.vendorId = new ObjectId(validation.data.vendorId);
    }

    const result = await db.collection(COLLECTIONS.STYLES).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Style not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Style updated successfully',
    });
  } catch (error) {
    console.error('Style PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE style (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid style ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection(COLLECTIONS.STYLES).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Style not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Style deactivated successfully',
    });
  } catch (error) {
    console.error('Style DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

