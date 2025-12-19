'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loading';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Scissors,
  Package,
  Truck,
  TrendingUp,
  Users,
  AlertCircle,
  Clock,
  CheckCircle,
  BarChart2,
  PieChartIcon,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

interface DashboardData {
  metrics: {
    totalCuttingReceivedToday: number;
    totalCuttingReceivedMonth: number;
    cuttingInProduction: number;
    pcsCompleted: number;
    pcsShipped: number;
    expectedReceivable: number;
    totalTailoringExpense: number;
    pendingFromTailors: number;
    totalVendors: number;
    totalStyles: number;
    activeTailors: number;
  };
  recentActivity: {
    type: string;
    description: string;
    date: string;
  }[];
  styleWiseData: {
    styleName: string;
    received: number;
    inProgress: number;
    completed: number;
  }[];
  vendorWiseData: {
    vendorName: string;
    shipped: number;
    pending: number;
  }[];
  range?: {
    startDate: string | null;
    endDate: string | null;
    label: string;
  };
}

interface AnalyticsData {
  efficiencyTrends: {
    period: string;
    received: number;
    completed: number;
    shipped: number;
  }[];
  tailorPerformance: {
    _id: string;
    tailorName: string;
    totalReturned: number;
    totalEarnings: number;
    jobCount: number;
    completionRate: number;
    avgTurnaround: number;
    pendingPcs: number;
  }[];
  styleProfitability: {
    styleName: string;
    styleCode: string;
    revenue: number;
    tailorCost: number;
    profit: number;
    profitMargin: number;
    totalShipped: number;
  }[];
  vendorAnalysis: {
    vendorName: string;
    totalCuttingReceived: number;
    totalShipped: number;
    pendingPcs: number;
    fulfillmentRate: number;
  }[];
  qcAnalysis: {
    styleName: string;
    total: number;
    passed: number;
    failed: number;
    rework: number;
    passRate: number;
  }[];
}

const COLORS = ['#df6358', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
const CHART_COLORS = {
  received: '#df6358',
  completed: '#22c55e',
  shipped: '#3b82f6',
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [analyticsTab, setAnalyticsTab] = useState<'efficiency' | 'tailors' | 'profitability' | 'vendors'>('efficiency');

  useEffect(() => {
    fetchDashboardData();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [analyticsPeriod]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${analyticsPeriod}`);
      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchDashboardData = async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const query = new URLSearchParams();
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      const response = await fetch(`/api/admin/dashboard${query.toString() ? `?${query.toString()}` : ''}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyRange = () => {
    fetchDashboardData({ startDate: startDate || undefined, endDate: endDate || undefined });
  };

  const quickSetRange = (range: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date();
    if (range === 'today') {
      const iso = now.toISOString().slice(0, 10);
      setStartDate(iso);
      setEndDate(iso);
      fetchDashboardData({ startDate: iso, endDate: iso });
    } else if (range === 'week') {
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      const startIso = start.toISOString().slice(0, 10);
      setStartDate(startIso);
      setEndDate(end);
      fetchDashboardData({ startDate: startIso, endDate: end });
    } else if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
      fetchDashboardData({ startDate: start, endDate: end });
    } else if (range === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
      fetchDashboardData({ startDate: start, endDate: end });
    } else {
      setStartDate('');
      setEndDate('');
      fetchDashboardData();
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Default data if API returns nothing yet
  const metrics = data?.metrics || {
    totalCuttingReceivedToday: 0,
    totalCuttingReceivedMonth: 0,
    cuttingInProduction: 0,
    pcsCompleted: 0,
    pcsShipped: 0,
    expectedReceivable: 0,
    totalTailoringExpense: 0,
    pendingFromTailors: 0,
    totalVendors: 0,
    totalStyles: 0,
    activeTailors: 0,
  };

  const statusData = [
    { name: 'In Production', value: metrics.cuttingInProduction },
    { name: 'Completed', value: metrics.pcsCompleted },
    { name: 'Shipped', value: metrics.pcsShipped },
    { name: 'Pending', value: metrics.pendingFromTailors },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle={`Welcome back! ${data?.range?.label || 'All time'} view`}
      />

      <div className="p-6 space-y-6">
        {/* Date Filters */}
        <div className="card p-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button className="btn btn-primary" onClick={applyRange}>
                Apply
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => quickSetRange('today')}>
              Today
            </button>
            <button className="btn btn-secondary" onClick={() => quickSetRange('week')}>
              Last 7 days
            </button>
            <button className="btn btn-secondary" onClick={() => quickSetRange('month')}>
              This Month
            </button>
            <button className="btn btn-secondary" onClick={() => quickSetRange('year')}>
              This Year
            </button>
            <button className="btn btn-ghost" onClick={() => quickSetRange('all')}>
              All Time
            </button>
          </div>
        </div>

        {data?.range && (
          <div className="flex items-center gap-3 text-sm text-surface-600 px-2">
            <span className="badge badge-neutral">Range</span>
            <span>
              {data.range.startDate ? new Date(data.range.startDate).toLocaleDateString() : 'All time'} -{' '}
              {data.range.endDate ? new Date(data.range.endDate).toLocaleDateString() : 'All time'}
            </span>
            <span className="text-surface-400">({data.range.label})</span>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Cutting Received (Range)"
            value={formatNumber(metrics.totalCuttingReceivedToday)}
            icon={Scissors}
            className="animate-slide-up stagger-1"
          />
          <StatCard
            title="In Production"
            value={formatNumber(metrics.cuttingInProduction)}
            icon={Package}
            className="animate-slide-up stagger-2"
          />
          <StatCard
            title="PCS Shipped"
            value={formatNumber(metrics.pcsShipped)}
            icon={Truck}
            className="animate-slide-up stagger-3"
          />
          <StatCard
            title="Expected Receivable"
            value={formatCurrency(metrics.expectedReceivable)}
            icon={TrendingUp}
            className="animate-slide-up stagger-4"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="This Month's Cutting"
            value={formatNumber(metrics.totalCuttingReceivedMonth)}
            icon={Scissors}
          />
          <StatCard
            title="PCS Completed"
            value={formatNumber(metrics.pcsCompleted)}
            icon={CheckCircle}
          />
          <StatCard
            title="Tailoring Expense"
            value={formatCurrency(metrics.totalTailoringExpense)}
            icon={Users}
          />
          <StatCard
            title="Pending from Tailors"
            value={formatNumber(metrics.pendingFromTailors)}
            icon={Clock}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Style-wise Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Style-wise Production</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.styleWiseData && data.styleWiseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.styleWiseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="styleName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="received" fill="#df6358" name="Received" />
                    <Bar dataKey="inProgress" fill="#f59e0b" name="In Progress" />
                    <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-surface-500">
                  No style data available yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Production Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-surface-600">Total Vendors</span>
                  <span className="font-semibold">{metrics.totalVendors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-600">Active Styles</span>
                  <span className="font-semibold">{metrics.totalStyles}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-600">Active Tailors</span>
                  <span className="font-semibold">{metrics.activeTailors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-600">Gross Margin</span>
                  <span className="font-semibold text-accent-600">
                    {formatCurrency(
                      metrics.expectedReceivable - metrics.totalTailoringExpense
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {data.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
                    >
                      <div className="mt-0.5">
                        {activity.type === 'cutting' && (
                          <Scissors className="w-4 h-4 text-primary-600" />
                        )}
                        {activity.type === 'shipment' && (
                          <Truck className="w-4 h-4 text-blue-600" />
                        )}
                        {activity.type === 'production' && (
                          <Package className="w-4 h-4 text-accent-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-surface-700 dark:text-surface-300">
                          {activity.description}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                          {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-surface-500">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" />
                <CardTitle>Advanced Analytics</CardTitle>
              </div>
              <div className="flex gap-2">
                {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setAnalyticsPeriod(period)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      analyticsPeriod === period
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Analytics Tabs */}
            <div className="flex gap-2 mb-6 border-b border-surface-200 dark:border-surface-700 overflow-x-auto">
              {[
                { key: 'efficiency', label: 'Production Efficiency', icon: TrendingUp },
                { key: 'tailors', label: 'Tailor Performance', icon: Users },
                { key: 'profitability', label: 'Style Profitability', icon: BarChart2 },
                { key: 'vendors', label: 'Vendor Analysis', icon: Truck },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAnalyticsTab(tab.key as typeof analyticsTab)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                    analyticsTab === tab.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-surface-500 hover:text-surface-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Efficiency Trends */}
            {analyticsTab === 'efficiency' && (
              <div>
                <p className="text-sm text-surface-500 mb-4">
                  Track production flow: cutting received → completed → shipped
                </p>
                {analytics?.efficiencyTrends && analytics.efficiencyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={analytics.efficiencyTrends}>
                      <defs>
                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.received} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.received} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.completed} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.completed} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorShipped" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.shipped} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.shipped} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="received"
                        stroke={CHART_COLORS.received}
                        fillOpacity={1}
                        fill="url(#colorReceived)"
                        name="Received"
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stroke={CHART_COLORS.completed}
                        fillOpacity={1}
                        fill="url(#colorCompleted)"
                        name="Completed"
                      />
                      <Area
                        type="monotone"
                        dataKey="shipped"
                        stroke={CHART_COLORS.shipped}
                        fillOpacity={1}
                        fill="url(#colorShipped)"
                        name="Shipped"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-surface-500">
                    No efficiency data available
                  </div>
                )}
              </div>
            )}

            {/* Tailor Performance */}
            {analyticsTab === 'tailors' && (
              <div>
                <p className="text-sm text-surface-500 mb-4">
                  Compare tailor output, earnings, and turnaround time
                </p>
                {analytics?.tailorPerformance && analytics.tailorPerformance.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.tailorPerformance.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="tailorName"
                          tick={{ fontSize: 11 }}
                          width={100}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalReturned" fill="#22c55e" name="Pcs Completed" />
                        <Bar dataKey="pendingPcs" fill="#f59e0b" name="Pending Pcs" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="overflow-x-auto">
                      <table className="table text-sm">
                        <thead>
                          <tr>
                            <th>Tailor</th>
                            <th>Completed</th>
                            <th>Earnings</th>
                            <th>Completion %</th>
                            <th>Avg Days</th>
                            <th>Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.tailorPerformance.slice(0, 10).map((t) => (
                            <tr key={t._id}>
                              <td className="font-medium">{t.tailorName || 'Unknown'}</td>
                              <td>{formatNumber(t.totalReturned)}</td>
                              <td>{formatCurrency(t.totalEarnings)}</td>
                              <td>
                                <Badge
                                  variant={
                                    t.completionRate >= 80
                                      ? 'success'
                                      : t.completionRate >= 50
                                      ? 'warning'
                                      : 'danger'
                                  }
                                >
                                  {t.completionRate.toFixed(0)}%
                                </Badge>
                              </td>
                              <td>{t.avgTurnaround || '-'}</td>
                              <td>{formatNumber(t.pendingPcs)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-surface-500">
                    No tailor performance data available
                  </div>
                )}
              </div>
            )}

            {/* Style Profitability */}
            {analyticsTab === 'profitability' && (
              <div>
                <p className="text-sm text-surface-500 mb-4">
                  Revenue from vendor rate minus tailor costs per style
                </p>
                {analytics?.styleProfitability && analytics.styleProfitability.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.styleProfitability.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="styleName" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                        <Bar dataKey="tailorCost" fill="#f59e0b" name="Tailor Cost" />
                        <Bar dataKey="profit" fill="#22c55e" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {analytics.styleProfitability.slice(0, 8).map((s, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            s.profit > 0
                              ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                              : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                          }`}
                        >
                          <p className="text-xs text-surface-500 truncate">{s.styleName}</p>
                          <p
                            className={`text-lg font-bold ${
                              s.profit > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(s.profit)}
                          </p>
                          <p className="text-xs text-surface-400">
                            {s.profitMargin.toFixed(1)}% margin
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-surface-500">
                    No profitability data available
                  </div>
                )}
              </div>
            )}

            {/* Vendor Analysis */}
            {analyticsTab === 'vendors' && (
              <div>
                <p className="text-sm text-surface-500 mb-4">
                  Cutting received vs shipped, and fulfillment rates per vendor
                </p>
                {analytics?.vendorAnalysis && analytics.vendorAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.vendorAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="vendorName" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalCuttingReceived" fill="#df6358" name="Received" />
                        <Bar dataKey="totalShipped" fill="#22c55e" name="Shipped" />
                        <Bar dataKey="pendingPcs" fill="#f59e0b" name="Pending" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="overflow-x-auto">
                      <table className="table text-sm">
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Received</th>
                            <th>Shipped</th>
                            <th>Pending</th>
                            <th>Fulfillment %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.vendorAnalysis.map((v, idx) => (
                            <tr key={idx}>
                              <td className="font-medium">{v.vendorName}</td>
                              <td>{formatNumber(v.totalCuttingReceived)}</td>
                              <td>{formatNumber(v.totalShipped)}</td>
                              <td>{formatNumber(v.pendingPcs)}</td>
                              <td>
                                <Badge
                                  variant={
                                    v.fulfillmentRate >= 80
                                      ? 'success'
                                      : v.fulfillmentRate >= 50
                                      ? 'warning'
                                      : 'danger'
                                  }
                                >
                                  {v.fulfillmentRate.toFixed(0)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-surface-500">
                    No vendor data available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

