import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions, hashPassword } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { userSchema } from '@/lib/validations';

// GET all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const users = await db
      .collection(COLLECTIONS.USERS)
      .aggregate([
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        {
          $lookup: {
            from: 'tailors',
            localField: 'tailorId',
            foreignField: '_id',
            as: 'tailor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$tailor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            password: 0, // Never return password
          },
        },
        { $sort: { name: 1 } },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = userSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    if (!validation.data.password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if email already exists
    const existing = await db
      .collection(COLLECTIONS.USERS)
      .findOne({ email: validation.data.email.toLowerCase() });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(validation.data.password);
    const now = new Date();

    const userData: Record<string, unknown> = {
      email: validation.data.email.toLowerCase(),
      password: hashedPassword,
      name: validation.data.name,
      role: validation.data.role,
      isActive: validation.data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    if (validation.data.vendorId) {
      userData.vendorId = new ObjectId(validation.data.vendorId);
    }
    if (validation.data.tailorId) {
      userData.tailorId = new ObjectId(validation.data.tailorId);
    }

    const result = await db.collection(COLLECTIONS.USERS).insertOne(userData);

    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: result.insertedId },
      { projection: { password: 0 } }
    );

    return NextResponse.json(
      { success: true, data: user, message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

