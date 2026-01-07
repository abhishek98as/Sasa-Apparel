import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { FinancialCalculationService } from '@/lib/financial/calculation-service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * Financial Calculation Cron Job
 * 
 * This endpoint should be called daily (e.g., at 2:00 AM) to calculate and store
 * financial metrics for various time periods.
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/financial-calculation",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * 
 * Or call manually:
 * GET /api/cron/financial-calculation?date=2025-01-07
 * 
 * Requires Authorization header with CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    console.log(`🔄 Starting financial calculation for ${format(targetDate, 'yyyy-MM-dd')}...`);

    const db = await getDb();
    const financialService = new FinancialCalculationService();

    const results = {
      daily: null as any,
      weekly: null as any,
      monthly: null as any,
      quarterly: null as any,
      yearly: null as any
    };

    // ========== DAILY CALCULATION ==========
    const dailyStart = startOfDay(targetDate);
    const dailyEnd = endOfDay(targetDate);
    const dailyKey = format(targetDate, 'yyyy-MM-dd');

    try {
      const dailyRevenue = await financialService.calculateRevenue(dailyStart, dailyEnd);
      const dailyCosts = await financialService.calculateCosts(dailyStart, dailyEnd);
      const dailyPL = await financialService.calculatePLStatement(dailyStart, dailyEnd);
      const dailyRevenueBreakdown = await financialService.calculateRevenueBreakdown(dailyStart, dailyEnd);
      const dailyTurnover = await financialService.calculateInventoryTurnover(dailyStart, dailyEnd);

      await db.collection(COLLECTIONS.FINANCIAL_PERIODS).updateOne(
        { periodType: 'daily', periodKey: dailyKey },
        {
          $set: {
            periodType: 'daily',
            periodKey: dailyKey,
            startDate: dailyStart,
            endDate: dailyEnd,
            revenue: {
              totalRevenue: dailyRevenue,
              byVendor: dailyRevenueBreakdown.byVendor,
              byStyle: dailyRevenueBreakdown.byStyle,
              byTailor: dailyRevenueBreakdown.byTailor || [],
              bySize: dailyRevenueBreakdown.bySize || [],
              byFabricType: dailyRevenueBreakdown.byFabricType || []
            },
            costs: dailyCosts,
            grossProfit: dailyPL.grossProfit,
            grossProfitMargin: dailyPL.grossProfitMargin,
            operatingProfit: dailyPL.operatingProfit,
            operatingProfitMargin: dailyPL.operatingProfitMargin,
            ebitda: dailyPL.ebitda,
            netProfit: dailyPL.netProfit,
            netProfitMargin: dailyPL.netProfitMargin,
            inventoryTurnover: dailyTurnover,
            returnOnSales: dailyRevenue > 0 ? (dailyPL.netProfit / dailyRevenue) * 100 : 0,
            isFinalized: false,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      results.daily = { periodKey: dailyKey, revenue: dailyRevenue, netProfit: dailyPL.netProfit };
      console.log(`✅ Daily calculation complete: ${dailyKey}`);
    } catch (error) {
      console.error('❌ Error in daily calculation:', error);
    }

    // ========== WEEKLY CALCULATION (if end of week) ==========
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy') + '-W' + format(weekStart, 'II');

    if (format(targetDate, 'yyyy-MM-dd') === format(weekEnd, 'yyyy-MM-dd')) {
      try {
        const weeklyRevenue = await financialService.calculateRevenue(weekStart, weekEnd);
        const weeklyCosts = await financialService.calculateCosts(weekStart, weekEnd);
        const weeklyPL = await financialService.calculatePLStatement(weekStart, weekEnd);

        await db.collection(COLLECTIONS.FINANCIAL_PERIODS).updateOne(
          { periodType: 'weekly', periodKey: weekKey },
          {
            $set: {
              periodType: 'weekly',
              periodKey: weekKey,
              startDate: weekStart,
              endDate: weekEnd,
              revenue: { totalRevenue: weeklyRevenue, byVendor: [], byStyle: [], byTailor: [], bySize: [], byFabricType: [] },
              costs: weeklyCosts,
              grossProfit: weeklyPL.grossProfit,
              grossProfitMargin: weeklyPL.grossProfitMargin,
              ebitda: weeklyPL.ebitda,
              netProfit: weeklyPL.netProfit,
              netProfitMargin: weeklyPL.netProfitMargin,
              isFinalized: false,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        results.weekly = { periodKey: weekKey, revenue: weeklyRevenue };
        console.log(`✅ Weekly calculation complete: ${weekKey}`);
      } catch (error) {
        console.error('❌ Error in weekly calculation:', error);
      }
    }

    // ========== MONTHLY CALCULATION (if end of month) ==========
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const monthKey = format(targetDate, 'yyyy-MM');

    if (format(targetDate, 'yyyy-MM-dd') === format(monthEnd, 'yyyy-MM-dd')) {
      try {
        const monthlyRevenue = await financialService.calculateRevenue(monthStart, monthEnd);
        const monthlyCosts = await financialService.calculateCosts(monthStart, monthEnd);
        const monthlyPL = await financialService.calculatePLStatement(monthStart, monthEnd);
        const monthlyRevenueBreakdown = await financialService.calculateRevenueBreakdown(monthStart, monthEnd);

        await db.collection(COLLECTIONS.FINANCIAL_PERIODS).updateOne(
          { periodType: 'monthly', periodKey: monthKey },
          {
            $set: {
              periodType: 'monthly',
              periodKey: monthKey,
              startDate: monthStart,
              endDate: monthEnd,
              revenue: {
                totalRevenue: monthlyRevenue,
                byVendor: monthlyRevenueBreakdown.byVendor,
                byStyle: monthlyRevenueBreakdown.byStyle,
                byTailor: monthlyRevenueBreakdown.byTailor || [],
                bySize: monthlyRevenueBreakdown.bySize || [],
                byFabricType: monthlyRevenueBreakdown.byFabricType || []
              },
              costs: monthlyCosts,
              grossProfit: monthlyPL.grossProfit,
              grossProfitMargin: monthlyPL.grossProfitMargin,
              ebitda: monthlyPL.ebitda,
              netProfit: monthlyPL.netProfit,
              netProfitMargin: monthlyPL.netProfitMargin,
              isFinalized: false,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        results.monthly = { periodKey: monthKey, revenue: monthlyRevenue };
        console.log(`✅ Monthly calculation complete: ${monthKey}`);
      } catch (error) {
        console.error('❌ Error in monthly calculation:', error);
      }
    }

    // ========== QUARTERLY CALCULATION (if end of quarter) ==========
    const quarterStart = startOfQuarter(targetDate);
    const quarterEnd = endOfQuarter(targetDate);
    const quarter = Math.ceil((targetDate.getMonth() + 1) / 3);
    const quarterKey = `${format(targetDate, 'yyyy')}-Q${quarter}`;

    if (format(targetDate, 'yyyy-MM-dd') === format(quarterEnd, 'yyyy-MM-dd')) {
      try {
        const quarterlyRevenue = await financialService.calculateRevenue(quarterStart, quarterEnd);
        const quarterlyCosts = await financialService.calculateCosts(quarterStart, quarterEnd);
        const quarterlyPL = await financialService.calculatePLStatement(quarterStart, quarterEnd);

        await db.collection(COLLECTIONS.FINANCIAL_PERIODS).updateOne(
          { periodType: 'quarterly', periodKey: quarterKey },
          {
            $set: {
              periodType: 'quarterly',
              periodKey: quarterKey,
              startDate: quarterStart,
              endDate: quarterEnd,
              revenue: { totalRevenue: quarterlyRevenue, byVendor: [], byStyle: [], byTailor: [], bySize: [], byFabricType: [] },
              costs: quarterlyCosts,
              grossProfit: quarterlyPL.grossProfit,
              grossProfitMargin: quarterlyPL.grossProfitMargin,
              ebitda: quarterlyPL.ebitda,
              netProfit: quarterlyPL.netProfit,
              netProfitMargin: quarterlyPL.netProfitMargin,
              isFinalized: false,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        results.quarterly = { periodKey: quarterKey, revenue: quarterlyRevenue };
        console.log(`✅ Quarterly calculation complete: ${quarterKey}`);
      } catch (error) {
        console.error('❌ Error in quarterly calculation:', error);
      }
    }

    // ========== YEARLY CALCULATION (if end of year) ==========
    const yearStart = startOfYear(targetDate);
    const yearEnd = endOfYear(targetDate);
    const yearKey = format(targetDate, 'yyyy');

    if (format(targetDate, 'yyyy-MM-dd') === format(yearEnd, 'yyyy-MM-dd')) {
      try {
        const yearlyRevenue = await financialService.calculateRevenue(yearStart, yearEnd);
        const yearlyCosts = await financialService.calculateCosts(yearStart, yearEnd);
        const yearlyPL = await financialService.calculatePLStatement(yearStart, yearEnd);
        const yearlyRevenueBreakdown = await financialService.calculateRevenueBreakdown(yearStart, yearEnd);

        await db.collection(COLLECTIONS.FINANCIAL_PERIODS).updateOne(
          { periodType: 'yearly', periodKey: yearKey },
          {
            $set: {
              periodType: 'yearly',
              periodKey: yearKey,
              startDate: yearStart,
              endDate: yearEnd,
              revenue: {
                totalRevenue: yearlyRevenue,
                byVendor: yearlyRevenueBreakdown.byVendor,
                byStyle: yearlyRevenueBreakdown.byStyle,
                byTailor: yearlyRevenueBreakdown.byTailor || [],
                bySize: yearlyRevenueBreakdown.bySize || [],
                byFabricType: yearlyRevenueBreakdown.byFabricType || []
              },
              costs: yearlyCosts,
              grossProfit: yearlyPL.grossProfit,
              grossProfitMargin: yearlyPL.grossProfitMargin,
              ebitda: yearlyPL.ebitda,
              netProfit: yearlyPL.netProfit,
              netProfitMargin: yearlyPL.netProfitMargin,
              isFinalized: false,
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        results.yearly = { periodKey: yearKey, revenue: yearlyRevenue };
        console.log(`✅ Yearly calculation complete: ${yearKey}`);
      } catch (error) {
        console.error('❌ Error in yearly calculation:', error);
      }
    }

    console.log('✅ Financial calculation cron job completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Financial calculations completed',
      date: format(targetDate, 'yyyy-MM-dd'),
      results
    });

  } catch (error: any) {
    console.error('❌ Financial calculation cron job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

