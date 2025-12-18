'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { PageLoader } from '@/components/ui/loading';
import { formatNumber, formatDate } from '@/lib/utils';
import { Package, Truck, Clock, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StyleData {
  _id: string;
  code: string;
  name: string;
  fabricType: string;
  totalReceived: number;
  totalShipped: number;
  inProduction: number;
  completed: number;
  pending: number;
}

interface Shipment {
  _id: string;
  date: string;
  challanNo: string;
  pcsShipped: number;
  styleName: string;
  styleCode: string;
}

interface DashboardData {
  styles: StyleData[];
  recentShipments: Shipment[];
  totals: {
    totalReceived: number;
    totalShipped: number;
    inProduction: number;
    pending: number;
  };
}

export default function VendorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/vendor/dashboard');
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

  if (isLoading) {
    return <PageLoader />;
  }

  const totals = data?.totals || {
    totalReceived: 0,
    totalShipped: 0,
    inProduction: 0,
    pending: 0,
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Vendor Dashboard"
        subtitle="Track your orders and shipments"
      />

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Received"
            value={formatNumber(totals.totalReceived)}
            icon={Package}
            className="animate-slide-up stagger-1"
          />
          <StatCard
            title="In Production"
            value={formatNumber(totals.inProduction)}
            icon={Clock}
            className="animate-slide-up stagger-2"
          />
          <StatCard
            title="Total Shipped"
            value={formatNumber(totals.totalShipped)}
            icon={Truck}
            className="animate-slide-up stagger-3"
          />
          <StatCard
            title="Pending Delivery"
            value={formatNumber(totals.pending)}
            icon={CheckCircle}
            className="animate-slide-up stagger-4"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Style Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Style-wise Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.styles && data.styles.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.styles}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="totalReceived" fill="#df6358" name="Received" />
                    <Bar dataKey="inProduction" fill="#f59e0b" name="In Production" />
                    <Bar dataKey="totalShipped" fill="#22c55e" name="Shipped" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-surface-500">
                  No style data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Shipments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Shipments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Style</TableHead>
                    <TableHead>Challan</TableHead>
                    <TableHead>Pieces</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data?.recentShipments.length ? (
                    <TableEmpty message="No shipments yet" colSpan={4} />
                  ) : (
                    data.recentShipments.map((shipment) => (
                      <TableRow key={shipment._id}>
                        <TableCell>{formatDate(shipment.date)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.styleName}</p>
                            <p className="text-xs text-surface-500">
                              {shipment.styleCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {shipment.challanNo}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNumber(shipment.pcsShipped)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Style Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Style-wise Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead>Fabric</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>In Production</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Shipped</TableHead>
                  <TableHead>Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.styles.length ? (
                  <TableEmpty message="No styles found" colSpan={7} />
                ) : (
                  data.styles.map((style) => (
                    <TableRow key={style._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{style.name}</p>
                          <p className="text-xs text-surface-500">{style.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{style.fabricType}</Badge>
                      </TableCell>
                      <TableCell>{formatNumber(style.totalReceived)}</TableCell>
                      <TableCell>
                        <span className="text-amber-600 font-medium">
                          {formatNumber(style.inProduction)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-accent-600 font-medium">
                          {formatNumber(style.completed)}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatNumber(style.totalShipped)}
                      </TableCell>
                      <TableCell>
                        {style.pending > 0 ? (
                          <Badge variant="warning">
                            {formatNumber(style.pending)} pending
                          </Badge>
                        ) : (
                          <Badge variant="success">All shipped</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

