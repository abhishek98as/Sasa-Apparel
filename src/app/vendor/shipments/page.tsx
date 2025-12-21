'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Package } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface Shipment {
  _id: string;
  style?: Style;
  pcsShipped: number;
  date: string;
  challanNo: string;
  notes?: string;
  amount?: number;
}

export default function VendorShipmentsPage() {
  const [activeTab, setActiveTab] = useState<'shipped' | 'ready'>('shipped');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [readyItems, setReadyItems] = useState<any[]>([]); // Using loose type for now
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [shipmentsRes, readyRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/vendor/ready-to-ship'),
      ]);

      const [shipmentsData, readyData] = await Promise.all([
        shipmentsRes.json(),
        readyRes.json(),
      ]);

      if (shipmentsData.success) {
        setShipments(shipmentsData.data);
      }
      if (readyData.success) {
        setReadyItems(readyData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShipments = shipments.filter(
    (s) =>
      s.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.challanNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReady = readyItems.filter(
    (r) =>
      r.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.style?.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPcs = filteredShipments.reduce((sum, s) => sum + s.pcsShipped, 0);
  const totalAmount = filteredShipments.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalReady = filteredReady.reduce((sum, r) => sum + r.pcsReady, 0);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Shipments & Orders"
        subtitle="Track shipped items and ready-to-ship orders"
      />

      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-surface-200">
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'shipped'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            onClick={() => setActiveTab('shipped')}
          >
            Shipped History
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'ready'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            onClick={() => setActiveTab('ready')}
          >
            Ready to Ship
            {readyItems.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {readyItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Summary Cards - Dynamic based on Tab */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTab === 'shipped' ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Truck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm text-surface-500">Total Shipments</p>
                      <p className="text-xl font-bold">{filteredShipments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-surface-500">Total Pieces</p>
                    <p className="text-xl font-bold">{formatNumber(totalPcs)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-surface-500">Total Value</p>
                    <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-surface-500">Orders Ready</p>
                      <p className="text-xl font-bold">{filteredReady.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-surface-500">Total Pieces Ready</p>
                    <p className="text-xl font-bold">{formatNumber(totalReady)}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder={activeTab === 'shipped' ? "Search shipments..." : "Search ready orders..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {activeTab === 'shipped' && <TableHead>Challan No</TableHead>}
                  <TableHead>Style</TableHead>
                  <TableHead>Pieces</TableHead>
                  {activeTab === 'shipped' && <TableHead>Amount</TableHead>}
                  <TableHead>Notes</TableHead>
                  {activeTab === 'ready' && <TableHead>Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab === 'shipped' ? (
                  filteredShipments.length === 0 ? (
                    <TableEmpty message="No shipments found" colSpan={6} />
                  ) : (
                    filteredShipments.map((shipment) => (
                      <TableRow key={shipment._id}>
                        <TableCell>{formatDate(shipment.date)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {shipment.challanNo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{shipment.style?.name}</p>
                            <p className="text-xs text-surface-500">
                              {shipment.style?.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNumber(shipment.pcsShipped)}
                        </TableCell>
                        <TableCell>
                          {shipment.amount ? formatCurrency(shipment.amount) : '-'}
                        </TableCell>
                        <TableCell className="text-surface-500">
                          {shipment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  filteredReady.length === 0 ? (
                    <TableEmpty message="No ready orders found" colSpan={5} />
                  ) : (
                    filteredReady.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.style?.name}</p>
                            <p className="text-xs text-surface-500">
                              {item.style?.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatNumber(item.pcsReady)}
                        </TableCell>
                        <TableCell className="text-surface-500">
                          {item.note || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">Ready to Ship</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

