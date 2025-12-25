"use client";

import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, format } from 'date-fns';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { EnhancedKPICard, KPICardProps } from '@/components/analytics/EnhancedKPICard';
import { EnhancedChart } from '@/components/analytics/EnhancedChart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  RefreshCw, 
  Filter,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface TrendData {
  date: string;
  value: number;
}

interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  percentage: number;
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPICardProps[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [breakdowns, setBreakdowns] = useState<{
    byStyle: BreakdownItem[];
    byVendor: BreakdownItem[];
    byTailor: BreakdownItem[];
  }>({
    byStyle: [],
    byVendor: [],
    byTailor: []
  });

  const [selectedMetric, setSelectedMetric] = useState('shippedPcs');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd')
      });

      // Fetch KPIs
      const kpiRes = await fetch(`/api/analytics/kpis?${params}`);
      const kpiData = await kpiRes.json();

      if (kpiData.success) {
        setKpis(kpiData.data);
      }

      // Fetch Trends
      const trendRes = await fetch(`/api/analytics/trends?${params}&metric=${selectedMetric}`);
      const trendResult = await trendRes.json();
      if (trendResult.success) {
        setTrendData(trendResult.data);
      }

      // Fetch Breakdowns
      const [styleBreakdown, vendorBreakdown, tailorBreakdown] = await Promise.all([
        fetch(`/api/analytics/breakdown?${params}&metric=shippedPcs&groupBy=style&limit=10`).then(r => r.json()),
        fetch(`/api/analytics/breakdown?${params}&metric=revenue&groupBy=vendor&limit=10`).then(r => r.json()),
        fetch(`/api/analytics/breakdown?${params}&metric=completedPcs&groupBy=tailor&limit=10`).then(r => r.json())
      ]);

      setBreakdowns({
        byStyle: styleBreakdown.success ? styleBreakdown.data : [],
        byVendor: vendorBreakdown.success ? vendorBreakdown.data : [],
        byTailor: tailorBreakdown.success ? tailorBreakdown.data : []
      });

    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedMetric]);

  const handleRefreshETL = async () => {
    setRefreshing(true);
    try {
      await fetch(`/api/cron/analytics?date=${format(new Date(), 'yyyy-MM-dd')}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`
        }
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to refresh ETL', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportType: 'kpis',
          format: 'csv',
          filters: {
            dateRange: {
              start: dateRange?.from,
              end: dateRange?.to
            }
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        // Poll for export completion
        alert(`Export initiated. Job ID: ${result.jobId}`);
      }
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            {session?.user?.role === 'admin' && 'Complete analytics across all operations'}
            {session?.user?.role === 'vendor' && 'Your vendor analytics and performance'}
            {session?.user?.role === 'tailor' && 'Your production and payment analytics'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Button 
            onClick={handleRefreshETL} 
            variant="ghost" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button onClick={handleExport} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.slice(0, 8).map(kpi => (
              <EnhancedKPICard
                key={kpi.id}
                {...kpi}
                loading={loading}
              />
            ))}
          </div>

          {/* Trend Chart */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-full lg:col-span-4">
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
                <CardDescription>Daily performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  {['shippedPcs', 'completedPcs', 'cuttingReceived', 'tailorExpense'].map(metric => (
                    <Button
                      key={metric}
                      variant={selectedMetric === metric ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedMetric(metric)}
                    >
                      {metric.replace(/([A-Z])/g, ' $1').trim()}
                    </Button>
                  ))}
                </div>
                <EnhancedChart
                  title=""
                  data={trendData}
                  type="area"
                  loading={loading}
                />
              </CardContent>
            </Card>

            {/* Top Styles Breakdown */}
            <Card className="col-span-full lg:col-span-3">
              <CardHeader>
                <CardTitle>Top 10 Styles by Shipment</CardTitle>
                <CardDescription>Highest performing styles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                    ))
                  ) : (
                    breakdowns.byStyle.slice(0, 10).map((item, index) => (
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

          {/* Additional Breakdowns */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Vendors by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {breakdowns.byVendor.slice(0, 5).map((item, index) => (
                    <div key={item.key} className="flex justify-between items-center">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-sm font-bold">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Tailors by Output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {breakdowns.byTailor.slice(0, 5).map((item, index) => (
                    <div key={item.key} className="flex justify-between items-center">
                      <span className="text-sm">{item.label}</span>
                      <span className="text-sm font-bold">
                        {new Intl.NumberFormat('en-IN').format(item.value)} pcs
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.filter(k => ['cutting-received', 'in-production', 'pcs-completed', 'pcs-shipped'].includes(k.id)).map(kpi => (
              <EnhancedKPICard key={kpi.id} {...kpi} loading={loading} />
            ))}
          </div>
          
          <EnhancedChart
            title="Production Flow"
            description="Daily production metrics"
            data={trendData}
            type="line"
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpis.filter(k => ['expected-receivable', 'tailoring-expense'].includes(k.id)).map(kpi => (
              <EnhancedKPICard key={kpi.id} {...kpi} loading={loading} />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <EnhancedChart
              title="Revenue Trend"
              data={trendData}
              type="bar"
              loading={loading}
            />
            <EnhancedChart
              title="Expense Trend"
              data={trendData}
              type="area"
              loading={loading}
            />
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.filter(k => ['approval-rate', 'production-yield', 'avg-tat', 'late-shipments'].includes(k.id)).map(kpi => (
              <EnhancedKPICard key={kpi.id} {...kpi} loading={loading} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics Overview</CardTitle>
              <CardDescription>Track quality and efficiency indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Quality breakdown charts and detailed metrics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
