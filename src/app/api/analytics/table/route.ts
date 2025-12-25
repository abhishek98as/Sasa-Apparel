import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnalyticsQueryService } from '@/lib/analytics/query-service';
import { parseISO, subDays } from 'date-fns';

/**
 * GET /api/analytics/table
 * Returns paginated table data for drilldowns
 * 
 * Query params:
 * - limit: page size (default 50)
 * - skip: offset
 * - sortBy: field to sort by
 * - sortDirection: asc | desc
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
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc';
    
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

    const searchText = searchParams.get('search');
    if (searchText) filters.searchText = searchText;

    // Initialize query service
    const queryService = new AnalyticsQueryService(
      session.user.tenantId,
      session.user.id,
      session.user.role,
      session.user.vendorId,
      session.user.tailorId
    );

    // Get table data
    const result = await queryService.getDrilldownTable(filters, {
      limit,
      skip,
      sortBy,
      sortDirection
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('[Analytics Table Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data', details: error.message },
      { status: 500 }
    );
  }
}
