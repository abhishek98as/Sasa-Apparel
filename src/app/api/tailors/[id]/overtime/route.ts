import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// Record overtime for a tailor
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
    const { date, hours, notes } = body;

    if (!date || !hours || hours <= 0) {
      return NextResponse.json(
        { success: false, error: 'Date and valid hours are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tailorId = new ObjectId(id);

    const result = await db.collection('tailors').updateOne(
      { _id: tailorId },
      {
        $push: {
          overtime: {
            date: new Date(date),
            hours,
            notes,
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
      message: 'Overtime recorded successfully',
    });
  } catch (error) {
    console.error('Tailor overtime POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

