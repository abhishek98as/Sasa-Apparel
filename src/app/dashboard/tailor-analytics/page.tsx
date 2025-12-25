"use client";

import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, format } from 'date-fns';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { EnhancedKPICard, KPICardProps } from '@/components/analytics/EnhancedKPICard';
import { EnhancedChart } from '@/components/analytics/EnhancedChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Package, Clock, TrendingUp } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function TailorAnalyticsDashboard() {
  const { data: session } = useSession();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPICardProps[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd')
      });

      // Tailor-scoped KPIs (backend automatically filters by tailorId based on session)
      const kpiRes = await fetch(`/api/analytics/kpis?${params}`);
      const kpiData = await kpiRes.json();

      if (kpiData.success) {
        // Filter relevant KPIs for tailor view
        const tailorKPIs = kpiData.data.filter((kpi: KPICardProps) =>
          ['pcs-completed', 'pending-from-tailors', 'tailoring-expense', 'production-yield'].includes(kpi.id)
        );
        setKpis(tailorKPIs);
      }

      // Fetch completion trends
      const trendRes = await fetch(`/api/analytics/trends?${params}&metric=completedPcs`);
      const trendResult = await trendRes.json();
      if (trendResult.success) {
        setTrendData(trendResult.data);
      }

      // Fetch active assignments
      // TODO: Create dedicated endpoint for tailor assignments
      setActiveAssignments([]);

    } catch (error) {
      console.error("Failed to fetch tailor analytics", error);
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
          <h2 className="text-3xl font-bold tracking-tight">Tailor Analytics</h2>
          <p className="text-muted-foreground">
            Your production performance and earnings
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
          title="Daily Production"
          description="Pieces completed per day"
          data={trendData}
          type="bar"
          loading={loading}
        />

        <Card>
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
            <CardDescription>Current work in progress</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : activeAssignments.length > 0 ? (
              <div className="space-y-3">
                {activeAssignments.map((assignment, index) => (
                  <div key={index} className="flex justify-between items-start p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{assignment.styleName}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.assignedPcs} pcs assigned
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        {assignment.completedPcs} completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.pendingPcs} pending
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No active assignments
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Your productivity metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <Package className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">Avg. Daily Output</h4>
              <p className="text-2xl font-bold">
                {trendData.length > 0 
                  ? Math.round(trendData.reduce((sum, d) => sum + d.value, 0) / trendData.length)
                  : 0
                } pcs
              </p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">Quality Rate</h4>
              <p className="text-2xl font-bold">98%</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">Avg. TAT</h4>
              <p className="text-2xl font-bold">5 days</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="text-sm font-medium text-muted-foreground">Earnings MTD</h4>
              <p className="text-2xl font-bold">
                {kpis.find(k => k.id === 'tailoring-expense')?.value || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
