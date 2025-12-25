import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnalyticsQueryService } from '@/lib/analytics/query-service';
import { parseISO, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/kpis
 * Returns all KPI cards for the dashboard
 * 
 * Query params:
 * - start: start date (YYYY-MM-DD)
 * - end: end date (YYYY-MM-DD)
 * - preset: today | 7d | 30d | mtd | ytd
 * - styleIds: comma-separated style IDs
 * - vendorIds: comma-separated vendor IDs
 * - tailorIds: comma-separated tailor IDs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse date range
    const preset = searchParams.get('preset');
    let start: Date, end: Date;
    
    if (preset) {
      end = new Date();
      switch (preset) {
        case 'today':
          start = new Date();
          start.setHours(0, 0, 0, 0);
          break;
        case '7d':
          start = subDays(end, 7);
          break;
        case '30d':
          start = subDays(end, 30);
          break;
        case 'mtd':
          start = new Date(end.getFullYear(), end.getMonth(), 1);
          break;
        case 'ytd':
          start = new Date(end.getFullYear(), 0, 1);
          break;
        default:
          start = subDays(end, 30);
      }
    } else {
      const startParam = searchParams.get('start');
      const endParam = searchParams.get('end');
      start = startParam ? parseISO(startParam) : subDays(new Date(), 30);
      end = endParam ? parseISO(endParam) : new Date();
    }

    // Parse filters
    const filters: any = {
      dateRange: { start, end, preset: preset || 'custom' }
    };

    const styleIds = searchParams.get('styleIds');
    if (styleIds) {
      filters.styleIds = styleIds.split(',').map(id => id.trim());
    }

    const vendorIds = searchParams.get('vendorIds');
    if (vendorIds) {
      filters.vendorIds = vendorIds.split(',').map(id => id.trim());
    }

    const tailorIds = searchParams.get('tailorIds');
    if (tailorIds) {
      filters.tailorIds = tailorIds.split(',').map(id => id.trim());
    }

    const sizeLabels = searchParams.get('sizeLabels');
    if (sizeLabels) {
      filters.sizeLabels = sizeLabels.split(',').map(s => s.trim());
    }

    const searchText = searchParams.get('search');
    if (searchText) {
      filters.searchText = searchText;
    }

    // Initialize query service with user context
    const queryService = new AnalyticsQueryService(
      session.user.tenantId,
      session.user.id,
      session.user.role,
      session.user.vendorId,
      session.user.tailorId
    );

    // Get KPI cards
    const kpis = await queryService.getKPICards(filters);

    return NextResponse.json({
      success: true,
      data: kpis,
      filters: {
        dateRange: { start, end },
        applied: filters
      }
    });

  } catch (error: any) {
    console.error('[Analytics KPIs Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPIs', details: error.message },
      { status: 500 }
    );
  }
}
