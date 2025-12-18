import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { tailorSchema } from '@/lib/validations';

const COLLECTION = 'tailors';

// GET single tailor
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
        { success: false, error: 'Invalid tailor ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tailor = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });

    if (!tailor) {
      return NextResponse.json(
        { success: false, error: 'Tailor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tailor });
  } catch (error) {
    console.error('Tailor GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update tailor
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
        { success: false, error: 'Invalid tailor ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = tailorSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...validation.data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Tailor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Tailor updated successfully',
    });
  } catch (error) {
    console.error('Tailor PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE tailor (soft delete)
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
        { success: false, error: 'Invalid tailor ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Tailor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tailor deactivated successfully',
    });
  } catch (error) {
    console.error('Tailor DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

