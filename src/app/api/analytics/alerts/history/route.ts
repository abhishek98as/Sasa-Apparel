import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/analytics/alerts/history
 * Get alert trigger history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const alertRuleId = searchParams.get('alertRuleId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = await getDb();
    const filter: any = {};

    if (session.user.tenantId) {
      filter.tenantId = new ObjectId(session.user.tenantId);
    }

    if (alertRuleId && ObjectId.isValid(alertRuleId)) {
      filter.alertRuleId = new ObjectId(alertRuleId);
    }

    const history = await db.collection(COLLECTIONS.ALERT_HISTORY)
      .find(filter)
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error: any) {
    console.error('[Alert History Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert history', details: error.message },
      { status: 500 }
    );
  }
}
