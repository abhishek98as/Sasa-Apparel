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
import { Search, Truck } from 'lucide-react';

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
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const response = await fetch('/api/shipments');
      const result = await response.json();
      if (result.success) {
        setShipments(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShipments = shipments.filter(
    (s) =>
      s.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.challanNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPcs = filteredShipments.reduce((sum, s) => sum + s.pcsShipped, 0);
  const totalAmount = filteredShipments.reduce((sum, s) => sum + (s.amount || 0), 0);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Shipment History"
        subtitle="View all shipments received"
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search shipments..."
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
                  <TableHead>Challan No</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Pieces</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
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
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

