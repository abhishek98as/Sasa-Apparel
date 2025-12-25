"use client";

import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, format } from 'date-fns';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { EnhancedKPICard, KPICardProps } from '@/components/analytics/EnhancedKPICard';
import { EnhancedChart } from '@/components/analytics/EnhancedChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, TrendingUp, CheckCircle, DollarSign } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function VendorAnalyticsDashboard() {
  const { data: session } = useSession();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPICardProps[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [styleBreakdown, setStyleBreakdown] = useState<any[]>([]);

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd')
      });

      // Vendor-scoped KPIs (backend automatically filters by vendorId based on session)
      const kpiRes = await fetch(`/api/analytics/kpis?${params}`);
      const kpiData = await kpiRes.json();

      if (kpiData.success) {
        // Filter relevant KPIs for vendor view
        const vendorKPIs = kpiData.data.filter((kpi: KPICardProps) =>
          ['pcs-shipped', 'expected-receivable', 'pcs-completed', 'approval-rate', 'cutting-received'].includes(kpi.id)
        );
        setKpis(vendorKPIs);
      }

      // Fetch trends
      const trendRes = await fetch(`/api/analytics/trends?${params}&metric=shippedPcs`);
      const trendResult = await trendRes.json();
      if (trendResult.success) {
        setTrendData(trendResult.data);
      }

      // Fetch style breakdown
      const breakdownRes = await fetch(`/api/analytics/breakdown?${params}&metric=shippedPcs&groupBy=style&limit=10`);
      const breakdownData = await breakdownRes.json();
      if (breakdownData.success) {
        setStyleBreakdown(breakdownData.data);
      }

    } catch (error) {
      console.error("Failed to fetch vendor analytics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vendor Analytics</h2>
          <p className="text-muted-foreground">
            Your performance metrics and order analytics
          </p>
        </div>
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <EnhancedKPICard
            key={kpi.id}
            {...kpi}
            loading={loading}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <EnhancedChart
          title="Shipment Trend"
          description="Daily pieces shipped"
          data={trendData}
          type="area"
          loading={loading}
        />

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Styles</CardTitle>
            <CardDescription>Your best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))
              ) : (
                styleBreakdown.map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-16 text-right">
                        {new Intl.NumberFormat('en-IN').format(item.value)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Vendor Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key metrics and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">Avg. Delivery Time</h4>
              <p className="text-2xl font-bold">12 days</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">On-Time Delivery</h4>
              <p className="text-2xl font-bold">94%</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <Package className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">Active Styles</h4>
              <p className="text-2xl font-bold">{styleBreakdown.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
