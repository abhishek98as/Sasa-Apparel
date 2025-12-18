import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions, hashPassword } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { userSchema } from '@/lib/validations';

// GET single user
export async function GET(
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
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update user
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
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = userSchema.partial().safeParse(body);

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

    // Hash password if provided
    if (validation.data.password) {
      updateData.password = await hashPassword(validation.data.password);
    } else {
      delete updateData.password;
    }

    // Convert IDs
    if (validation.data.vendorId) {
      updateData.vendorId = new ObjectId(validation.data.vendorId);
    }
    if (validation.data.tailorId) {
      updateData.tailorId = new ObjectId(validation.data.tailorId);
    }

    const result = await db.collection(COLLECTIONS.USERS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('User PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE user (soft delete)
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
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Prevent deleting own account
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection(COLLECTIONS.USERS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

