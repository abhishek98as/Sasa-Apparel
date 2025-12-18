import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { fabricCuttingSchema } from '@/lib/validations';

// GET single fabric cutting record
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
        { success: false, error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const record = await db
      .collection(COLLECTIONS.FABRIC_CUTTING)
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
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

    if (!record.length) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record[0] });
  } catch (error) {
    console.error('Fabric Cutting GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update fabric cutting record
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
        { success: false, error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = fabricCuttingSchema.partial().safeParse(body);

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

    if (validation.data.styleId) {
      updateData.styleId = new ObjectId(validation.data.styleId);
    }
    if (validation.data.vendorId) {
      updateData.vendorId = new ObjectId(validation.data.vendorId);
    }
    if (validation.data.date) {
      updateData.date = new Date(validation.data.date);
    }

    const result = await db.collection(COLLECTIONS.FABRIC_CUTTING).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Record updated successfully',
    });
  } catch (error) {
    console.error('Fabric Cutting PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE fabric cutting record
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
        { success: false, error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Check if there are any tailor jobs referencing this cutting
    const hasJobs = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .findOne({ fabricCuttingId: new ObjectId(id) });

    if (hasJobs) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete: cutting has assigned jobs' },
        { status: 400 }
      );
    }

    const result = await db.collection(COLLECTIONS.FABRIC_CUTTING).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch (error) {
    console.error('Fabric Cutting DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

