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

interface Tailor {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  specialization?: string;
  isActive: boolean;
}

export default function TailorsPage() {
  const { showToast } = useToast();
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTailor, setEditingTailor] = useState<Tailor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    specialization: '',
    isActive: true,
  });

  useEffect(() => {
    fetchTailors();
  }, []);

  const fetchTailors = async () => {
    try {
      const response = await fetch('/api/tailors');
      const result = await response.json();
      if (result.success) {
        setTailors(result.data);
      }
    } catch (error) {
      showToast('Failed to fetch tailors', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (tailor?: Tailor) => {
    if (tailor) {
      setEditingTailor(tailor);
      setFormData({
        name: tailor.name,
        phone: tailor.phone,
        address: tailor.address || '',
        specialization: tailor.specialization || '',
        isActive: tailor.isActive,
      });
    } else {
      setEditingTailor(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        specialization: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingTailor
        ? `/api/tailors/${editingTailor._id}`
        : '/api/tailors';
      const method = editingTailor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        setIsModalOpen(false);
        fetchTailors();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tailor: Tailor) => {
    if (!confirm(`Are you sure you want to deactivate "${tailor.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tailors/${tailor._id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        fetchTailors();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const filteredTailors = tailors.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm)
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Tailors"
        subtitle="Manage your tailoring workforce"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Tailor
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search tailors..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTailors.length === 0 ? (
                  <TableEmpty message="No tailors found" colSpan={6} />
                ) : (
                  filteredTailors.map((tailor) => (
                    <TableRow key={tailor._id}>
                      <TableCell className="font-medium">{tailor.name}</TableCell>
                      <TableCell>{tailor.phone}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tailor.address || '-'}
                      </TableCell>
                      <TableCell>
                        {tailor.specialization ? (
                          <Badge variant="info">{tailor.specialization}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tailor.isActive ? 'success' : 'danger'}>
                          {tailor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(tailor)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-500 hover:text-surface-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tailor)}
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
        title={editingTailor ? 'Edit Tailor' : 'Add New Tailor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Specialization"
            value={formData.specialization}
            onChange={(e) =>
              setFormData({ ...formData, specialization: e.target.value })
            }
            placeholder="e.g., Shirts, Pants, Dresses"
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
              {editingTailor ? 'Update Tailor' : 'Create Tailor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

