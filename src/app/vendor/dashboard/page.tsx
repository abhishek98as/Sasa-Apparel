'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
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
import { Package, Truck, Clock, CheckCircle, ChevronDown, ChevronUp, Send } from 'lucide-react';
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
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

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

  const toggleCardExpand = (cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
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
        {/* Key Metrics - Updated Labels as per client requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Point 7: Total Received → Total Cutting/Fabric Sent */}
          <div 
            className="animate-slide-up stagger-1 cursor-pointer"
            onClick={() => toggleCardExpand('cutting-sent')}
          >
            <StatCard
              title="Total Cutting/Fabric Sent"
              value={formatNumber(totals.totalReceived)}
              subtitle="pcs/mtr/kg"
              icon={Send}
            />
            {expandedCards['cutting-sent'] && (
              <div className="mt-2 p-3 bg-surface-50 rounded-lg border border-surface-200 text-sm">
                <p className="text-surface-600">Total items sent by company</p>
                <div className="mt-2 space-y-1">
                  {data?.styles.slice(0, 3).map(s => (
                    <div key={s._id} className="flex justify-between text-xs">
                      <span>{s.code}</span>
                      <span className="font-medium">{formatNumber(s.totalReceived)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Point 8: In Production with drill-down */}
          <div 
            className="animate-slide-up stagger-2 cursor-pointer"
            onClick={() => setShowProgressModal(true)}
          >
            <StatCard
              title="In Production"
              value={formatNumber(totals.inProduction)}
              subtitle="Click for details"
              icon={Clock}
            />
          </div>

          {/* Point 6: Total Shipped → Total Shipment Received */}
          <div 
            className="animate-slide-up stagger-3 cursor-pointer"
            onClick={() => toggleCardExpand('shipment-received')}
          >
            <StatCard
              title="Total Shipment Received"
              value={formatNumber(totals.totalShipped)}
              icon={Truck}
            />
            {expandedCards['shipment-received'] && (
              <div className="mt-2 p-3 bg-surface-50 rounded-lg border border-surface-200 text-sm">
                <p className="text-surface-600">Shipments received from company</p>
                <div className="mt-2 space-y-1">
                  {data?.recentShipments.slice(0, 3).map(s => (
                    <div key={s._id} className="flex justify-between text-xs">
                      <span>{s.challanNo}</span>
                      <span className="font-medium">{formatNumber(s.pcsShipped)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <StatCard
            title="Pending Delivery"
            value={formatNumber(totals.pending)}
            icon={CheckCircle}
            className="animate-slide-up stagger-4"
          />

          {/* Completed pieces */}
          <StatCard
            title="Completed"
            value={formatNumber(data?.styles.reduce((sum, s) => sum + s.completed, 0) || 0)}
            icon={Package}
            className="animate-slide-up stagger-5"
          />
        </div>

        {/* Style-wise Progress Modal (Point 8) */}
        <Modal
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          title="Style-wise Production Progress"
          size="lg"
        >
          <div className="space-y-4">
            {data?.styles.map((style) => (
              <div key={style._id} className="p-4 border border-surface-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{style.name}</p>
                    <p className="text-sm text-surface-500">{style.code}</p>
                  </div>
                  <Badge variant="info">{style.fabricType}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-xs text-surface-500">Sent</p>
                    <p className="font-bold text-blue-600">{formatNumber(style.totalReceived)}</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded">
                    <p className="text-xs text-surface-500">In Progress</p>
                    <p className="font-bold text-amber-600">{formatNumber(style.inProduction)}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <p className="text-xs text-surface-500">Completed</p>
                    <p className="font-bold text-green-600">{formatNumber(style.completed)}</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-xs text-surface-500">Shipped</p>
                    <p className="font-bold text-purple-600">{formatNumber(style.totalShipped)}</p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 h-2 bg-surface-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-green-500 to-purple-500"
                    style={{ 
                      width: `${style.totalReceived > 0 ? (style.totalShipped / style.totalReceived) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-surface-500 mt-1 text-right">
                  {style.totalReceived > 0 
                    ? Math.round((style.totalShipped / style.totalReceived) * 100) 
                    : 0}% shipped
                </p>
              </div>
            ))}
          </div>
        </Modal>

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
                    <Bar dataKey="totalReceived" fill="#3b82f6" name="Cutting Sent" />
                    <Bar dataKey="inProduction" fill="#f59e0b" name="In Production" />
                    <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                    <Bar dataKey="totalShipped" fill="#8b5cf6" name="Shipment Received" />
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
                  <TableHead>Cutting Sent</TableHead>
                  <TableHead>In Production</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Shipment Received</TableHead>
                  <TableHead>Status</TableHead>
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

