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
import { formatDateTime } from '@/lib/utils';

interface Vendor {
  _id: string;
  name: string;
}

interface Tailor {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'vendor' | 'tailor';
  vendorId?: string;
  vendor?: Vendor;
  tailorId?: string;
  tailor?: Tailor;
  isActive: boolean;
  lastLogin?: string;
}

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'vendor' as 'admin' | 'vendor' | 'tailor',
    vendorId: '',
    tailorId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, vendorsRes, tailorsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/vendors?active=true'),
        fetch('/api/tailors?active=true'),
      ]);
      const [usersData, vendorsData, tailorsData] = await Promise.all([
        usersRes.json(),
        vendorsRes.json(),
        tailorsRes.json(),
      ]);

      if (usersData.success) setUsers(usersData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (tailorsData.success) setTailors(tailorsData.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        name: user.name,
        role: user.role,
        vendorId: user.vendorId || '',
        tailorId: user.tailorId || '',
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'vendor',
        vendorId: '',
        tailorId: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        vendorId: formData.role === 'vendor' ? formData.vendorId : undefined,
        tailorId: formData.role === 'tailor' ? formData.tailorId : undefined,
      };

      // Don't send empty password on update
      if (editingUser && !formData.password) {
        delete (payload as Record<string, unknown>).password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate "${user.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user._id}`, {
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

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'tailor', label: 'Tailor' },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'vendor':
        return 'info';
      case 'tailor':
        return 'success';
      default:
        return 'neutral';
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Users"
        subtitle="Manage system users and access"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search users..."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableEmpty message="No users found" colSpan={7} />
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.vendor?.name || user.tailor?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'success' : 'danger'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-500 hover:text-surface-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
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
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={editingUser ? 'New Password (leave empty to keep current)' : 'Password'}
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required={!editingUser}
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as 'admin' | 'vendor' | 'tailor',
                  vendorId: '',
                  tailorId: '',
                })
              }
              options={roleOptions}
              required
            />
          </div>

          {formData.role === 'vendor' && (
            <Select
              label="Link to Vendor"
              value={formData.vendorId}
              onChange={(e) =>
                setFormData({ ...formData, vendorId: e.target.value })
              }
              options={vendors.map((v) => ({ value: v._id, label: v.name }))}
              placeholder="Select vendor"
              required
            />
          )}

          {formData.role === 'tailor' && (
            <Select
              label="Link to Tailor"
              value={formData.tailorId}
              onChange={(e) =>
                setFormData({ ...formData, tailorId: e.target.value })
              }
              options={tailors.map((t) => ({ value: t._id, label: t.name }))}
              placeholder="Select tailor"
              required
            />
          )}

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
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

