import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/analytics/alerts
 * List all alert rules for the user/tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const filter: any = {};

    if (session.user.tenantId) {
      filter.tenantId = new ObjectId(session.user.tenantId);
    }

    const alerts = await db.collection(COLLECTIONS.ALERT_RULES)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: alerts
    });

  } catch (error: any) {
    console.error('[Alerts GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/alerts
 * Create a new alert rule
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      metric,
      condition,
      evaluationWindow,
      filters,
      notifications,
      throttle
    } = body;

    if (!name || !metric || !condition || !notifications) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const alertRule = {
      tenantId: session.user.tenantId ? new ObjectId(session.user.tenantId) : undefined,
      name,
      description,
      metric,
      condition,
      evaluationWindow: evaluationWindow || { period: 'daily' },
      filters: filters || {},
      notifications,
      isActive: true,
      triggerCount: 0,
      throttle: throttle || { minIntervalMinutes: 60 },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTIONS.ALERT_RULES).insertOne(alertRule);

    return NextResponse.json({
      success: true,
      alertId: result.insertedId,
      message: 'Alert rule created successfully'
    });

  } catch (error: any) {
    console.error('[Alerts POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to create alert', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/alerts/history
 * Get alert trigger history
 */
export async function history(request: NextRequest) {
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
