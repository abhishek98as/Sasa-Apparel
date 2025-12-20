import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { tailorSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const COLLECTION = 'tailors';

// GET all tailors
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    const query = activeOnly ? { isActive: true } : {};
    const tailors = await db
      .collection(COLLECTION)
      .find(query)
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: tailors });
  } catch (error) {
    console.error('Tailors GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create tailor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = tailorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const result = await db.collection(COLLECTION).insertOne({
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    });

    const tailor = await db.collection(COLLECTION).findOne({ _id: result.insertedId });

    return NextResponse.json(
      { success: true, data: tailor, message: 'Tailor created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tailors POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

