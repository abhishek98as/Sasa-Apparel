'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
import { formatNumber, formatDate, formatCurrency, generateChallanNo } from '@/lib/utils';
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react';

interface Vendor {
  _id: string;
  name: string;
}

interface Style {
  _id: string;
  code: string;
  name: string;
  vendorId: string;
}

interface Shipment {
  _id: string;
  vendorId: string;
  vendor?: Vendor;
  styleId: string;
  style?: Style;
  pcsShipped: number;
  date: string;
  challanNo: string;
  notes?: string;
  amount?: number;
  rate?: { vendorRate: number };
}

export default function ShipmentsPage() {
  const { showToast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [filteredStyles, setFilteredStyles] = useState<Style[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterVendor, setFilterVendor] = useState('');

  const [formData, setFormData] = useState({
    vendorId: '',
    styleId: '',
    pcsShipped: 0,
    date: new Date().toISOString().split('T')[0],
    challanNo: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.vendorId) {
      setFilteredStyles(styles.filter((s) => s.vendorId === formData.vendorId));
    } else {
      setFilteredStyles(styles);
    }
  }, [formData.vendorId, styles]);

  const fetchData = async () => {
    try {
      const [shipmentsRes, vendorsRes, stylesRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/vendors?active=true'),
        fetch('/api/styles?active=true'),
      ]);
      const [shipmentsData, vendorsData, stylesData] = await Promise.all([
        shipmentsRes.json(),
        vendorsRes.json(),
        stylesRes.json(),
      ]);

      if (shipmentsData.success) setShipments(shipmentsData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (stylesData.success) {
        setStyles(stylesData.data);
        setFilteredStyles(stylesData.data);
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (shipment?: Shipment) => {
    if (shipment) {
      setEditingShipment(shipment);
      setFormData({
        vendorId: shipment.vendorId,
        styleId: shipment.styleId,
        pcsShipped: shipment.pcsShipped,
        date: new Date(shipment.date).toISOString().split('T')[0],
        challanNo: shipment.challanNo,
        notes: shipment.notes || '',
      });
    } else {
      setEditingShipment(null);
      setFormData({
        vendorId: '',
        styleId: '',
        pcsShipped: 0,
        date: new Date().toISOString().split('T')[0],
        challanNo: generateChallanNo(),
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingShipment
        ? `/api/shipments/${editingShipment._id}`
        : '/api/shipments';
      const method = editingShipment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        setIsModalOpen(false);
        fetchData();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (shipment: Shipment) => {
    if (!confirm('Are you sure you want to delete this shipment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/shipments/${shipment._id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        fetchData();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.challanNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = !filterVendor || s.vendorId === filterVendor;

    return matchesSearch && matchesVendor;
  });

  // Totals
  const totalPcs = filteredShipments.reduce((sum, s) => sum + s.pcsShipped, 0);
  const totalAmount = filteredShipments.reduce((sum, s) => sum + (s.amount || 0), 0);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Shipments"
        subtitle="Track shipments to vendors"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Create Shipment
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-surface-500">Total Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            options={[
              { value: '', label: 'All Vendors' },
              ...vendors.map((v) => ({ value: v._id, label: v.name })),
            ]}
            className="w-48"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Challan No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Pieces</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.length === 0 ? (
                  <TableEmpty message="No shipments found" colSpan={9} />
                ) : (
                  filteredShipments.map((shipment) => (
                    <TableRow key={shipment._id}>
                      <TableCell>{formatDate(shipment.date)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {shipment.challanNo}
                      </TableCell>
                      <TableCell>{shipment.vendor?.name}</TableCell>
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
                        {shipment.rate?.vendorRate
                          ? formatCurrency(shipment.rate.vendorRate)
                          : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {shipment.amount ? formatCurrency(shipment.amount) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {shipment.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(shipment)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-500 hover:text-surface-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(shipment)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-surface-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingShipment ? 'Edit Shipment' : 'Create New Shipment'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Vendor"
              value={formData.vendorId}
              onChange={(e) =>
                setFormData({ ...formData, vendorId: e.target.value, styleId: '' })
              }
              options={vendors.map((v) => ({ value: v._id, label: v.name }))}
              placeholder="Select vendor"
              required
            />
            <Select
              label="Style"
              value={formData.styleId}
              onChange={(e) =>
                setFormData({ ...formData, styleId: e.target.value })
              }
              options={filteredStyles.map((s) => ({
                value: s._id,
                label: `${s.code} - ${s.name}`,
              }))}
              placeholder="Select style"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input
              label="Pieces Shipped"
              type="number"
              min="1"
              value={formData.pcsShipped}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pcsShipped: parseInt(e.target.value) || 0,
                })
              }
              required
            />
            <Input
              label="Challan No"
              value={formData.challanNo}
              onChange={(e) =>
                setFormData({ ...formData, challanNo: e.target.value })
              }
              required
            />
          </div>

          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingShipment ? 'Update Shipment' : 'Create Shipment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

