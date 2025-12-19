import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { qcChecklistSchema } from '@/lib/validations';

// List QC checklists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const styleId = searchParams.get('styleId');

    const query: Record<string, unknown> = {};
    if (styleId && ObjectId.isValid(styleId)) query.styleId = new ObjectId(styleId);

    const db = await getDb();
    const checklists = await db
      .collection(COLLECTIONS.QC_CHECKLISTS)
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: checklists });
  } catch (error) {
    console.error('QC checklists GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Create checklist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = qcChecklistSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();
    const version =
      (await db
        .collection(COLLECTIONS.QC_CHECKLISTS)
        .countDocuments({ styleId: new ObjectId(validation.data.styleId) })) + 1;

    const result = await db.collection(COLLECTIONS.QC_CHECKLISTS).insertOne({
      ...validation.data,
      styleId: new ObjectId(validation.data.styleId),
      version,
      createdAt: now,
      updatedAt: now,
    });

    const checklist = await db
      .collection(COLLECTIONS.QC_CHECKLISTS)
      .findOne({ _id: result.insertedId });

    return NextResponse.json(
      { success: true, data: checklist, message: 'QC checklist created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('QC checklists POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

