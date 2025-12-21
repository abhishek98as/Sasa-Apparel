'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
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
import { useToast } from '@/components/ui/toast';
import { formatNumber, formatDate, generateChallanNo } from '@/lib/utils';
import { Package, Truck, CheckCircle, Search, Filter } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface Vendor {
  _id: string;
  name: string;
}

interface ReadyItem {
  _id: string;
  styleId: string;
  style?: Style;
  vendorId: string;
  vendor?: Vendor;
  completedPcs: number;
  qcPassedPcs: number;
  shippedPcs: number;
  readyToShipPcs: number;
  tailorName?: string;
  completedDate?: string;
}

export default function ReadyToShipPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReadyItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [shipmentData, setShipmentData] = useState({
    pcsToShip: 0,
    challanNo: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [readyRes, vendorsRes] = await Promise.all([
        fetch('/api/ready-to-ship'),
        fetch('/api/vendors?active=true'),
      ]);
      const [readyData, vendorsData] = await Promise.all([
        readyRes.json(),
        vendorsRes.json(),
      ]);

      if (readyData.success) setItems(readyData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map(i => i._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(i => i !== id));
    }
  };

  const handleOpenShipModal = () => {
    const totalReady = selectedItems.reduce((sum, id) => {
      const item = items.find(i => i._id === id);
      return sum + (item?.readyToShipPcs || 0);
    }, 0);

    setShipmentData({
      pcsToShip: totalReady,
      challanNo: generateChallanNo(),
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsShipModalOpen(true);
  };

  const handleCreateShipment = async () => {
    if (selectedItems.length === 0) {
      showToast('Please select items to ship', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Group selected items by vendor and style
      const groupedItems = selectedItems.reduce((acc, id) => {
        const item = items.find(i => i._id === id);
        if (item) {
          const key = `${item.vendorId}-${item.styleId}`;
          if (!acc[key]) {
            acc[key] = {
              vendorId: item.vendorId,
              styleId: item.styleId,
              pcs: 0,
            };
          }
          acc[key].pcs += item.readyToShipPcs;
        }
        return acc;
      }, {} as Record<string, { vendorId: string; styleId: string; pcs: number }>);

      // Create shipments for each vendor-style combination
      for (const group of Object.values(groupedItems)) {
        const response = await fetch('/api/shipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: group.vendorId,
            styleId: group.styleId,
            pcsShipped: group.pcs,
            date: shipmentData.date,
            challanNo: shipmentData.challanNo,
            notes: shipmentData.notes,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      showToast('Shipments created successfully!', 'success');
      setIsShipModalOpen(false);
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create shipments',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.style?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = !filterVendor || item.vendorId === filterVendor;

    return matchesSearch && matchesVendor && item.readyToShipPcs > 0;
  });

  const totalReadyToShip = filteredItems.reduce((sum, i) => sum + i.readyToShipPcs, 0);
  const selectedCount = selectedItems.length;
  const selectedPcs = selectedItems.reduce((sum, id) => {
    const item = items.find(i => i._id === id);
    return sum + (item?.readyToShipPcs || 0);
  }, 0);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Ready to Ship"
        subtitle="Completed items pending shipment to vendors"
        actions={
          selectedCount > 0 && (
            <Button onClick={handleOpenShipModal}>
              <Truck className="w-4 h-4" />
              Ship Selected ({selectedCount})
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Ready to Ship</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(totalReadyToShip)} pcs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Items Selected</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Selected Pieces</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(selectedPcs)} pcs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <Input
                  placeholder="Search by style or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-48">
                <Select
                  label="Vendor"
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  options={[
                    { value: '', label: 'All Vendors' },
                    ...vendors.map((v) => ({ value: v._id, label: v.name })),
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-surface-300"
                    />
                  </TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>QC Passed</TableHead>
                  <TableHead>Already Shipped</TableHead>
                  <TableHead>Ready to Ship</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableEmpty message="No items ready to ship" colSpan={8} />
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={(e) => handleSelectItem(item._id, e.target.checked)}
                          className="rounded border-surface-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.style?.name}</p>
                          <p className="text-xs text-surface-500">{item.style?.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.vendor?.name}</TableCell>
                      <TableCell>{formatNumber(item.completedPcs)}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          {formatNumber(item.qcPassedPcs)}
                        </span>
                      </TableCell>
                      <TableCell>{formatNumber(item.shippedPcs)}</TableCell>
                      <TableCell>
                        <span className="text-xl font-bold text-primary-600">
                          {formatNumber(item.readyToShipPcs)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">Ready</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Ship Modal */}
      <Modal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title="Create Shipment"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-surface-50 rounded-lg">
            <p className="text-sm text-surface-500">Items to ship</p>
            <p className="text-2xl font-bold">{formatNumber(selectedPcs)} pieces</p>
            <p className="text-sm text-surface-500">from {selectedCount} items</p>
          </div>

          <Input
            label="Challan No"
            value={shipmentData.challanNo}
            onChange={(e) => setShipmentData({ ...shipmentData, challanNo: e.target.value })}
            required
          />

          <Input
            label="Shipment Date"
            type="date"
            value={shipmentData.date}
            onChange={(e) => setShipmentData({ ...shipmentData, date: e.target.value })}
            required
          />

          <Input
            label="Notes"
            value={shipmentData.notes}
            onChange={(e) => setShipmentData({ ...shipmentData, notes: e.target.value })}
            placeholder="Optional notes..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsShipModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateShipment}
              isLoading={isSubmitting}
            >
              Create Shipment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

