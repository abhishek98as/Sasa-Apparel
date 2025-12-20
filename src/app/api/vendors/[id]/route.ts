import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { vendorSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET single vendor
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
        { success: false, error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const vendor = await db
      .collection(COLLECTIONS.VENDORS)
      .findOne({ _id: new ObjectId(id) });

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Vendor GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update vendor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = vendorSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    if (session.user.role === 'manager') {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'vendor',
        entityId: new ObjectId(id),
        action: 'update',
        payload: {
          collection: COLLECTIONS.VENDORS,
          type: 'update',
          data: validation.data,
        },
        requestedBy: {
          userId: new ObjectId(session.user.id),
          name: session.user.name,
          role: session.user.role,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: true,
          data: { approvalId: approval.insertedId },
          message: 'Update submitted for admin approval',
        },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.VENDORS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...validation.data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    console.error('Vendor PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE vendor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }

    const db = await getDb();

    if (session.user.role === 'manager') {
      const approval = await db.collection(COLLECTIONS.APPROVALS).insertOne({
        entityType: 'vendor',
        entityId: new ObjectId(id),
        action: 'delete',
        payload: {
          collection: COLLECTIONS.VENDORS,
          type: 'softDelete',
          data: {},
        },
        requestedBy: {
          userId: new ObjectId(session.user.id),
          name: session.user.name,
          role: session.user.role,
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: true,
          data: { approvalId: approval.insertedId },
          message: 'Deletion submitted for admin approval',
        },
        { status: 202 }
      );
    }

    const result = await db.collection(COLLECTIONS.VENDORS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor deactivated successfully',
    });
  } catch (error) {
    console.error('Vendor DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

