import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnalyticsQueryService } from '@/lib/analytics/query-service';
import { parseISO, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/trends
 * Returns time-series trend data for a specific metric
 * 
 * Query params:
 * - metric: shippedPcs | completedPcs | cuttingReceived | tailorExpense | revenue
 * - granularity: day | week | month
 * - start: start date
 * - end: end date
 * - styleIds, vendorIds, tailorIds: filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    const metric = searchParams.get('metric') || 'shippedPcs';
    const granularity = (searchParams.get('granularity') as 'day' | 'week' | 'month') || 'day';
    
    // Parse date range
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const start = startParam ? parseISO(startParam) : subDays(new Date(), 30);
    const end = endParam ? parseISO(endParam) : new Date();

    // Parse filters
    const filters: any = {
      dateRange: { start, end }
    };

    const styleIds = searchParams.get('styleIds');
    if (styleIds) filters.styleIds = styleIds.split(',');

    const vendorIds = searchParams.get('vendorIds');
    if (vendorIds) filters.vendorIds = vendorIds.split(',');

    const tailorIds = searchParams.get('tailorIds');
    if (tailorIds) filters.tailorIds = tailorIds.split(',');

    // Initialize query service
    const queryService = new AnalyticsQueryService(
      session.user.tenantId,
      session.user.id,
      session.user.role,
      session.user.vendorId,
      session.user.tailorId
    );

    // Get trend data
    const trendData = await queryService.getTrendData(metric, filters, granularity);

    return NextResponse.json({
      success: true,
      data: trendData,
      meta: {
        metric,
        granularity,
        dateRange: { start, end },
        count: trendData.length
      }
    });

  } catch (error: any) {
    console.error('[Analytics Trends Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend data', details: error.message },
      { status: 500 }
    );
  }
}

