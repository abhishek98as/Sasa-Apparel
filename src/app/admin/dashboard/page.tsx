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

const COLORS = ['#df6358', '#22c55e', '#3b82f6', '#f59e0b'];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [changeMessage, setChangeMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

        <div className="card p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-3">
            <Button
              onClick={async () => {
                setIsChanging(true);
                setChangeMessage(null);
                try {
                  const res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      currentPassword: currentPassword.trim(),
                      newPassword: newPassword.trim(),
                    }),
                  });
                  const result = await res.json();
                  if (result.success) {
                    setChangeMessage('Password updated');
                    setCurrentPassword('');
                    setNewPassword('');
                  } else {
                    setChangeMessage(result.error || 'Unable to update password');
                  }
                } catch {
                  setChangeMessage('Unable to update password');
                } finally {
                  setIsChanging(false);
                }
              }}
              isLoading={isChanging}
            >
              Update Password
            </Button>
            {changeMessage && (
              <span className="text-xs text-surface-600">{changeMessage}</span>
            )}
          </div>
        </div>

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
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface-50"
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
                        <p className="text-sm text-surface-700">
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
      </div>
    </div>
  );
}

