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
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Vendor {
  _id: string;
  name: string;
}

interface Style {
  _id: string;
  code: string;
  name: string;
  vendorId: string;
  vendor?: Vendor;
  fabricType: string;
  description?: string;
  isActive: boolean;
}

export default function StylesPage() {
  const { showToast } = useToast();
  const [styles, setStyles] = useState<Style[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    vendorId: '',
    fabricType: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stylesRes, vendorsRes] = await Promise.all([
        fetch('/api/styles'),
        fetch('/api/vendors?active=true'),
      ]);
      const [stylesData, vendorsData] = await Promise.all([
        stylesRes.json(),
        vendorsRes.json(),
      ]);

      if (stylesData.success) setStyles(stylesData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (style?: Style) => {
    if (style) {
      setEditingStyle(style);
      setFormData({
        code: style.code,
        name: style.name,
        vendorId: style.vendorId,
        fabricType: style.fabricType,
        description: style.description || '',
        isActive: style.isActive,
      });
    } else {
      setEditingStyle(null);
      setFormData({
        code: '',
        name: '',
        vendorId: '',
        fabricType: '',
        description: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingStyle
        ? `/api/styles/${editingStyle._id}`
        : '/api/styles';
      const method = editingStyle ? 'PUT' : 'POST';

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

  const handleDelete = async (style: Style) => {
    if (!confirm(`Are you sure you want to deactivate "${style.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/styles/${style._id}`, {
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

  const filteredStyles = styles.filter(
    (s) =>
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fabricTypes = [
    { value: 'Cotton', label: 'Cotton' },
    { value: 'Linen', label: 'Linen' },
    { value: 'Silk', label: 'Silk' },
    { value: 'Denim', label: 'Denim' },
    { value: 'Polyester', label: 'Polyester' },
    { value: 'Wool', label: 'Wool' },
    { value: 'Rayon', label: 'Rayon' },
    { value: 'Blend', label: 'Blend' },
    { value: 'Other', label: 'Other' },
  ];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Styles"
        subtitle="Manage product styles and designs"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Style
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search styles..."
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
                  <TableHead>Style Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Fabric Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStyles.length === 0 ? (
                  <TableEmpty message="No styles found" colSpan={6} />
                ) : (
                  filteredStyles.map((style) => (
                    <TableRow key={style._id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {style.code}
                      </TableCell>
                      <TableCell>{style.name}</TableCell>
                      <TableCell>{style.vendor?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="info">{style.fabricType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={style.isActive ? 'success' : 'danger'}>
                          {style.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(style)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-500 hover:text-surface-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(style)}
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
        title={editingStyle ? 'Edit Style' : 'Add New Style'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Style Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., STY-001"
              required
              disabled={!!editingStyle}
            />
            <Input
              label="Style Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Vendor"
              value={formData.vendorId}
              onChange={(e) =>
                setFormData({ ...formData, vendorId: e.target.value })
              }
              options={vendors.map((v) => ({ value: v._id, label: v.name }))}
              placeholder="Select vendor"
              required
            />
            <Select
              label="Fabric Type"
              value={formData.fabricType}
              onChange={(e) =>
                setFormData({ ...formData, fabricType: e.target.value })
              }
              options={fabricTypes}
              placeholder="Select fabric type"
              required
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
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
              {editingStyle ? 'Update Style' : 'Create Style'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

