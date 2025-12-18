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
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';

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

interface FabricCutting {
  _id: string;
  styleId: string;
  style?: Style;
  vendorId: string;
  vendor?: Vendor;
  fabricReceivedMeters: number;
  cuttingReceivedPcs: number;
  cuttingInHouse: boolean;
  date: string;
  notes?: string;
}

export default function FabricCuttingPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<FabricCutting[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [filteredStyles, setFilteredStyles] = useState<Style[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FabricCutting | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [formData, setFormData] = useState({
    vendorId: '',
    styleId: '',
    fabricReceivedMeters: 0,
    cuttingReceivedPcs: 0,
    cuttingInHouse: false,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter styles by selected vendor
    if (formData.vendorId) {
      setFilteredStyles(styles.filter((s) => s.vendorId === formData.vendorId));
    } else {
      setFilteredStyles(styles);
    }
  }, [formData.vendorId, styles]);

  const fetchData = async () => {
    try {
      const [recordsRes, vendorsRes, stylesRes] = await Promise.all([
        fetch('/api/fabric-cutting'),
        fetch('/api/vendors?active=true'),
        fetch('/api/styles?active=true'),
      ]);
      const [recordsData, vendorsData, stylesData] = await Promise.all([
        recordsRes.json(),
        vendorsRes.json(),
        stylesRes.json(),
      ]);

      if (recordsData.success) setRecords(recordsData.data);
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

  const handleOpenModal = (record?: FabricCutting) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        vendorId: record.vendorId,
        styleId: record.styleId,
        fabricReceivedMeters: record.fabricReceivedMeters,
        cuttingReceivedPcs: record.cuttingReceivedPcs,
        cuttingInHouse: record.cuttingInHouse,
        date: new Date(record.date).toISOString().split('T')[0],
        notes: record.notes || '',
      });
    } else {
      setEditingRecord(null);
      setFormData({
        vendorId: '',
        styleId: '',
        fabricReceivedMeters: 0,
        cuttingReceivedPcs: 0,
        cuttingInHouse: false,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingRecord
        ? `/api/fabric-cutting/${editingRecord._id}`
        : '/api/fabric-cutting';
      const method = editingRecord ? 'PUT' : 'POST';

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

  const handleDelete = async (record: FabricCutting) => {
    if (!confirm('Are you sure you want to delete this cutting record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/fabric-cutting/${record._id}`, {
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

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.style?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = !filterVendor || r.vendorId === filterVendor;

    const recordDate = new Date(r.date);
    const matchesStartDate =
      !filterStartDate || recordDate >= new Date(filterStartDate);
    const matchesEndDate =
      !filterEndDate || recordDate <= new Date(filterEndDate);

    return matchesSearch && matchesVendor && matchesStartDate && matchesEndDate;
  });

  // Calculate totals
  const totalFabric = filteredRecords.reduce(
    (sum, r) => sum + r.fabricReceivedMeters,
    0
  );
  const totalCutting = filteredRecords.reduce(
    (sum, r) => sum + r.cuttingReceivedPcs,
    0
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Fabric & Cutting"
        subtitle="Track fabric receipts and cutting records"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
        }
      />

      <div className="p-6 space-y-6">
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
              <div className="w-40">
                <Input
                  label="From Date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label="To Date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Totals */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-surface-100">
              <div>
                <span className="text-sm text-surface-500">Total Fabric:</span>
                <span className="ml-2 font-semibold">
                  {formatNumber(totalFabric)} m
                </span>
              </div>
              <div>
                <span className="text-sm text-surface-500">Total Cutting:</span>
                <span className="ml-2 font-semibold">
                  {formatNumber(totalCutting)} pcs
                </span>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Fabric (m)</TableHead>
                  <TableHead>Cutting (pcs)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableEmpty message="No records found" colSpan={8} />
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.style?.name}</p>
                          <p className="text-xs text-surface-500">
                            {record.style?.code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{record.vendor?.name}</TableCell>
                      <TableCell>{formatNumber(record.fabricReceivedMeters)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatNumber(record.cuttingReceivedPcs)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={record.cuttingInHouse ? 'warning' : 'info'}
                        >
                          {record.cuttingInHouse ? 'In-house' : 'Pre-cut'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(record)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-500 hover:text-surface-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
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
        title={editingRecord ? 'Edit Cutting Record' : 'Add Cutting Record'}
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
              label="Fabric Received (meters)"
              type="number"
              min="0"
              step="0.01"
              value={formData.fabricReceivedMeters}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fabricReceivedMeters: parseFloat(e.target.value) || 0,
                })
              }
              required
            />
            <Input
              label="Cutting Received (pcs)"
              type="number"
              min="1"
              value={formData.cuttingReceivedPcs}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cuttingReceivedPcs: parseInt(e.target.value) || 0,
                })
              }
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cuttingInHouse"
              checked={formData.cuttingInHouse}
              onChange={(e) =>
                setFormData({ ...formData, cuttingInHouse: e.target.checked })
              }
              className="rounded border-surface-300"
            />
            <label htmlFor="cuttingInHouse" className="text-sm text-surface-700">
              Cut in-house (not pre-cut from vendor)
            </label>
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
              {editingRecord ? 'Update Record' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

