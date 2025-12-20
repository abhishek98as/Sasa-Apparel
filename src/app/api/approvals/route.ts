import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

// List approval requests (admin/manager)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';

    const db = await getDb();
    const approvals = await db
      .collection(COLLECTIONS.APPROVALS)
      .find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ success: true, data: approvals });
  } catch (error) {
    console.error('Approvals GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

