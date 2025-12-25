import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/analytics/reports/scheduled
 * List all scheduled reports for the user/tenant
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

    // Only admins can see all reports; others see their own
    if (session.user.role !== 'admin') {
      filter['recipients.email'] = session.user.email;
    }

    const reports = await db.collection(COLLECTIONS.SCHEDULED_REPORTS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: reports
    });

  } catch (error: any) {
    console.error('[Scheduled Reports GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/reports/scheduled
 * Create a new scheduled report
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can create scheduled reports
    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      schedule,
      recipients,
      reportType,
      filters,
      format,
      includeCharts
    } = body;

    if (!name || !schedule || !recipients || !reportType || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const scheduledReport = {
      tenantId: session.user.tenantId ? new ObjectId(session.user.tenantId) : undefined,
      name,
      description,
      schedule,
      recipients,
      reportType,
      filters: filters || {},
      format,
      includeCharts: includeCharts || false,
      isActive: true,
      runCount: 0,
      nextRun: calculateNextRun(schedule),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTIONS.SCHEDULED_REPORTS).insertOne(scheduledReport);

    return NextResponse.json({
      success: true,
      reportId: result.insertedId,
      message: 'Scheduled report created successfully'
    });

  } catch (error: any) {
    console.error('[Scheduled Reports POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled report', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/reports/scheduled/:id
 * Update a scheduled report
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const reportId = url.pathname.split('/').pop();

    if (!reportId || !ObjectId.isValid(reportId)) {
      return NextResponse.json({ error: 'Invalid reportId' }, { status: 400 });
    }

    const body = await request.json();
    const { isActive, schedule, recipients, filters } = body;

    const db = await getDb();

    const updateData: any = {
      updatedAt: new Date()
    };

    if (isActive !== undefined) updateData.isActive = isActive;
    if (schedule) {
      updateData.schedule = schedule;
      updateData.nextRun = calculateNextRun(schedule);
    }
    if (recipients) updateData.recipients = recipients;
    if (filters) updateData.filters = filters;

    const result = await db.collection(COLLECTIONS.SCHEDULED_REPORTS).updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled report updated successfully'
    });

  } catch (error: any) {
    console.error('[Scheduled Reports PATCH Error]', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled report', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/reports/scheduled/:id
 * Delete a scheduled report
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const reportId = url.pathname.split('/').pop();

    if (!reportId || !ObjectId.isValid(reportId)) {
      return NextResponse.json({ error: 'Invalid reportId' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection(COLLECTIONS.SCHEDULED_REPORTS).deleteOne({
      _id: new ObjectId(reportId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });

  } catch (error: any) {
    console.error('[Scheduled Reports DELETE Error]', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled report', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calculate next run time based on schedule
 */
function calculateNextRun(schedule: any): Date {
  const now = new Date();
  
  if (schedule.frequency === 'daily') {
    const [hours, minutes] = schedule.time.split(':');
    const next = new Date(now);
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  if (schedule.frequency === 'weekly') {
    const [hours, minutes] = schedule.time.split(':');
    const next = new Date(now);
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const currentDay = next.getDay();
    const targetDay = schedule.dayOfWeek || 1; // Default to Monday
    let daysToAdd = targetDay - currentDay;
    
    if (daysToAdd <= 0 || (daysToAdd === 0 && next <= now)) {
      daysToAdd += 7;
    }
    
    next.setDate(next.getDate() + daysToAdd);
    return next;
  }
  
  if (schedule.frequency === 'monthly') {
    const [hours, minutes] = schedule.time.split(':');
    const next = new Date(now);
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    next.setDate(schedule.dayOfMonth || 1);
    
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    
    return next;
  }
  
  // Default: tomorrow at the same time
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  return next;
}
