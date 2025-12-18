'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Vendor {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  gstNumber?: string;
  isActive: boolean;
}

export default function VendorsPage() {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    isActive: true,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      const result = await response.json();
      if (result.success) {
        setVendors(result.data);
      }
    } catch (error) {
      showToast('Failed to fetch vendors', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email || '',
        address: vendor.address,
        gstNumber: vendor.gstNumber || '',
        isActive: vendor.isActive,
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingVendor
        ? `/api/vendors/${editingVendor._id}`
        : '/api/vendors';
      const method = editingVendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        setIsModalOpen(false);
        fetchVendors();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to deactivate "${vendor.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendor._id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        fetchVendors();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Vendors"
        subtitle="Manage your vendor relationships"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Vendor
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search vendors..."
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
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableEmpty message="No vendors found" colSpan={6} />
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor._id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPerson}</TableCell>
                      <TableCell>{vendor.phone}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {vendor.address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={vendor.isActive ? 'success' : 'danger'}>
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(vendor)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-500 hover:text-surface-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vendor)}
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
        title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vendor Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) =>
                setFormData({ ...formData, contactPerson: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />

          <Input
            label="GST Number"
            value={formData.gstNumber}
            onChange={(e) =>
              setFormData({ ...formData, gstNumber: e.target.value })
            }
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-surface-300"
            />
            <label htmlFor="isActive" className="text-sm text-surface-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingVendor ? 'Update Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

