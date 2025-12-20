import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions, hashPassword, verifyPassword } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = (body?.currentPassword || '').trim();
    const newPassword = (body?.newPassword || '').trim();

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Current and new password are required (min 6 chars)' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(session.user.id) });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashed = await hashPassword(newPassword);
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: user._id },
      { $set: { password: hashed, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

