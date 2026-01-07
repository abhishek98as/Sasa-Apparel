import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FinancialCalculationService } from '@/lib/financial/calculation-service';
import { startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : startOfMonth(endDate);

    const financialService = new FinancialCalculationService();
    const totalRevenue = await financialService.calculateRevenue(startDate, endDate);
    const breakdown = await financialService.calculateRevenueBreakdown(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        breakdown,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error: any) {
    console.error('Error fetching revenue breakdown:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

