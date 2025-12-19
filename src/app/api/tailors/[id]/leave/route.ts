import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

// Record leave for a tailor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
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
    const { date, reason, approved = true } = body;

    if (!date || !reason) {
      return NextResponse.json(
        { success: false, error: 'Date and reason are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tailorId = new ObjectId(id);

    const result = await db.collection('tailors').updateOne(
      { _id: tailorId },
      {
        $push: {
          leaves: {
            date: new Date(date),
            reason,
            approved,
          },
        } as any,
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Tailor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Leave recorded successfully',
    });
  } catch (error) {
    console.error('Tailor leave POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a leave entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
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
    const { date } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tailorId = new ObjectId(id);
    const leaveDate = new Date(date);

    const result = await db.collection('tailors').updateOne(
      { _id: tailorId },
      {
        $pull: {
          leaves: { date: leaveDate },
        } as any,
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Tailor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Leave removed successfully',
    });
  } catch (error) {
    console.error('Tailor leave DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

