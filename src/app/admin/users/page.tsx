'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
import { Plus, Pencil, Trash2, Search, Shield, Settings } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Vendor {
  _id: string;
  name: string;
}

interface Tailor {
  _id: string;
  name: string;
}

interface ManagerPermissions {
  dashboard?: boolean;
  vendors?: boolean;
  tailors?: boolean;
  styles?: boolean;
  fabricCutting?: boolean;
  tailorJobs?: boolean;
  shipments?: boolean;
  rates?: boolean;
  users?: boolean;
  inventory?: boolean;
  qc?: boolean;
  payments?: boolean;
  approvals?: boolean;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'vendor' | 'tailor';
  vendorId?: string;
  vendor?: Vendor;
  tailorId?: string;
  tailor?: Tailor;
  permissions?: ManagerPermissions;
  isActive: boolean;
  lastLogin?: string;
}

const allPermissions: { key: keyof ManagerPermissions; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'tailors', label: 'Tailors' },
  { key: 'styles', label: 'Styles' },
  { key: 'fabricCutting', label: 'Fabric Cutting' },
  { key: 'tailorJobs', label: 'Tailor Jobs' },
  { key: 'shipments', label: 'Shipments' },
  { key: 'rates', label: 'Rates' },
  { key: 'users', label: 'Users' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'qc', label: 'Quality Control' },
  { key: 'payments', label: 'Payments' },
  { key: 'approvals', label: 'Approvals' },
];

export default function UsersPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'vendor' as 'admin' | 'manager' | 'vendor' | 'tailor',
    vendorId: '',
    tailorId: '',
    isActive: true,
    permissions: {} as ManagerPermissions,
  });

  const isAdmin = session?.user?.role === 'admin';

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
        permissions: user.permissions || {},
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
        permissions: {},
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

      const payload: Record<string, unknown> = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
      };

      // Add password only if provided
      if (formData.password) {
        payload.password = formData.password;
      }

      // Add role-specific fields
      if (formData.role === 'vendor' && formData.vendorId) {
        payload.vendorId = formData.vendorId;
      }
      if (formData.role === 'tailor' && formData.tailorId) {
        payload.tailorId = formData.tailorId;
      }
      if (formData.role === 'manager') {
        payload.permissions = formData.permissions;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message || 'User saved successfully', 'success');
        setIsModalOpen(false);
        fetchData();
      } else {
        showToast(result.error || 'Failed to save user', 'error');
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
        showToast(result.message || 'User deactivated successfully', 'success');
        fetchData();
      } else {
        showToast(result.error || 'Failed to deactivate user', 'error');
      }
    } catch (error) {
      showToast('An error occurred while deleting', 'error');
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${permissionsUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: permissionsUser.permissions,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Permissions updated successfully', 'success');
        setShowPermissionsModal(false);
        setPermissionsUser(null);
        fetchData();
      } else {
        showToast(result.error || 'Failed to update permissions', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPermissionsModal = (user: User) => {
    setPermissionsUser({
      ...user,
      permissions: user.permissions || {},
    });
    setShowPermissionsModal(true);
  };

  const togglePermission = (key: keyof ManagerPermissions) => {
    if (!permissionsUser) return;
    setPermissionsUser({
      ...permissionsUser,
      permissions: {
        ...permissionsUser.permissions,
        [key]: !permissionsUser.permissions?.[key],
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'tailor', label: 'Tailor' },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'manager':
        return 'warning';
      case 'vendor':
        return 'info';
      case 'tailor':
        return 'success';
      default:
        return 'neutral';
    }
  };

  // Count permissions
  const getPermissionCount = (permissions?: ManagerPermissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Users"
        subtitle="Manage system users, roles, and permissions"
        actions={
          isAdmin && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-bold text-red-600">
                {users.filter((u) => u.role === 'admin').length}
              </p>
              <p className="text-sm text-surface-500">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-bold text-amber-600">
                {users.filter((u) => u.role === 'manager').length}
              </p>
              <p className="text-sm text-surface-500">Managers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-bold text-blue-600">
                {users.filter((u) => u.role === 'vendor').length}
              </p>
              <p className="text-sm text-surface-500">Vendors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-bold text-green-600">
                {users.filter((u) => u.role === 'tailor').length}
              </p>
              <p className="text-sm text-surface-500">Tailors</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="select w-40"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="vendor">Vendor</option>
            <option value="tailor">Tailor</option>
          </select>
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
                  <TableHead>Linked To / Permissions</TableHead>
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
                        {user.role === 'vendor' && user.vendor?.name}
                        {user.role === 'tailor' && user.tailor?.name}
                        {user.role === 'manager' && (
                          <span className="text-sm text-surface-500">
                            {getPermissionCount(user.permissions)} of {allPermissions.length} menus
                          </span>
                        )}
                        {user.role === 'admin' && (
                          <span className="text-sm text-surface-500">Full Access</span>
                        )}
                        {!user.vendor?.name && !user.tailor?.name && user.role !== 'manager' && user.role !== 'admin' && '-'}
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
                        <div className="flex items-center gap-1">
                          {isAdmin && user.role === 'manager' && (
                            <button
                              onClick={() => openPermissionsModal(user)}
                              className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 hover:text-amber-600"
                              title="Manage Permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenModal(user)}
                                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 hover:text-surface-700"
                                title="Edit User"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-surface-500 hover:text-red-600"
                                title="Deactivate User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Info about manager role */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-surface-900 dark:text-surface-50">
                  Manager Role Information
                </h3>
                <ul className="text-sm text-surface-600 dark:text-surface-400 mt-2 space-y-1 list-disc list-inside">
                  <li>Managers can perform most operations like admins</li>
                  <li>Manager&apos;s update and delete actions require admin approval</li>
                  <li>Admin can control which menu items each manager can access</li>
                  <li>Click the shield icon to manage a manager&apos;s permissions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit User Modal */}
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
                  role: e.target.value as 'admin' | 'manager' | 'vendor' | 'tailor',
                  vendorId: '',
                  tailorId: '',
                  permissions: e.target.value === 'manager' ? formData.permissions : {},
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
              options={[
                { value: '', label: 'Select vendor...' },
                ...vendors.map((v) => ({ value: v._id, label: v.name })),
              ]}
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
              options={[
                { value: '', label: 'Select tailor...' },
                ...tailors.map((t) => ({ value: t._id, label: t.name })),
              ]}
              required
            />
          )}

          {formData.role === 'manager' && (
            <div>
              <label className="label">Menu Permissions</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                {allPermissions.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.permissions[perm.key] || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [perm.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded"
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-surface-500 mt-2">
                Select which menu items this manager can access
              </p>
            </div>
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
            <label htmlFor="isActive" className="text-sm text-surface-700 dark:text-surface-300">
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

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setPermissionsUser(null);
        }}
        title={`Manage Permissions - ${permissionsUser?.name}`}
      >
        {permissionsUser && (
          <div className="space-y-4">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Select which menu items this manager can access. Note: Manager actions that modify data
              will still require admin approval.
            </p>

            <div className="space-y-2">
              {allPermissions.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700"
                >
                  <span className="font-medium">{perm.label}</span>
                  <input
                    type="checkbox"
                    checked={permissionsUser.permissions?.[perm.key] || false}
                    onChange={() => togglePermission(perm.key)}
                    className="rounded w-5 h-5"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const allPerms: ManagerPermissions = {};
                    allPermissions.forEach((p) => {
                      allPerms[p.key] = true;
                    });
                    setPermissionsUser({ ...permissionsUser, permissions: allPerms });
                  }}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPermissionsUser({ ...permissionsUser, permissions: {} })}
                >
                  Clear All
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setPermissionsUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSavePermissions} isLoading={isSubmitting}>
                  Save Permissions
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
