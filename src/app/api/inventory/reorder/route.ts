import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { reorderSuggestionSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// List reorder suggestions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const suggestions = await db
      .collection(COLLECTIONS.REORDER_SUGGESTIONS)
      .aggregate([
        { $sort: { status: 1, updatedAt: -1 } },
        {
          $lookup: {
            from: COLLECTIONS.INVENTORY_ITEMS,
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Reorder GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Update status of reorder suggestion
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = reorderSuggestionSchema.partial().safeParse(body);
    if (!validation.success || !body?.id || !ObjectId.isValid(body.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection(COLLECTIONS.REORDER_SUGGESTIONS).findOneAndUpdate(
      { _id: new ObjectId(body.id) },
      { $set: { ...validation.data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result, message: 'Reorder updated' });
  } catch (error) {
    console.error('Reorder PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

