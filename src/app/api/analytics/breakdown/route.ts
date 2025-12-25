import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnalyticsQueryService } from '@/lib/analytics/query-service';
import { parseISO, subDays } from 'date-fns';

/**
 * GET /api/analytics/breakdown
 * Returns breakdown data grouped by a dimension
 * 
 * Query params:
 * - metric: shippedPcs | revenue | completedPcs | etc.
 * - groupBy: style | vendor | tailor | size | fabric
 * - limit: number of top results (default 10)
 * - start, end: date range
 * - filters: styleIds, vendorIds, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    const metric = searchParams.get('metric') || 'shippedPcs';
    const groupBy = (searchParams.get('groupBy') as 'style' | 'vendor' | 'tailor' | 'size' | 'fabric') || 'style';
    const limit = parseInt(searchParams.get('limit') || '10');
    
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

    // Get breakdown data
    const breakdown = await queryService.getBreakdown(metric, groupBy, filters, limit);

    return NextResponse.json({
      success: true,
      data: breakdown,
      meta: {
        metric,
        groupBy,
        limit,
        dateRange: { start, end }
      }
    });

  } catch (error: any) {
    console.error('[Analytics Breakdown Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch breakdown data', details: error.message },
      { status: 500 }
    );
  }
}
