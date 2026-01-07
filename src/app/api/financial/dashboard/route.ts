import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FinancialCalculationService } from '@/lib/financial/calculation-service';
import { subDays, startOfMonth, startOfYear } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date, endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      endDate = new Date();
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = startOfMonth(endDate);
          break;
        case 'quarter':
          startDate = startOfMonth(endDate);
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate = startOfYear(endDate);
          break;
        default:
          startDate = startOfMonth(endDate);
      }
    }

    const financialService = new FinancialCalculationService();
    const summary = await financialService.calculateFinancialSummary(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error: any) {
    console.error('Error fetching financial dashboard:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}

