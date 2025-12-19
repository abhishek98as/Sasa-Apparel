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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Shield,
  Settings,
  Eye,
  FilePlus,
  FileEdit,
  Trash,
  Check,
  X,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Vendor {
  _id: string;
  name: string;
}

interface Tailor {
  _id: string;
  name: string;
}

interface CRUDPermission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
}

interface ManagerPermissions {
  dashboard?: CRUDPermission;
  vendors?: CRUDPermission;
  tailors?: CRUDPermission;
  styles?: CRUDPermission;
  fabricCutting?: CRUDPermission;
  distribution?: CRUDPermission;
  production?: CRUDPermission;
  shipments?: CRUDPermission;
  rates?: CRUDPermission;
  inventory?: CRUDPermission;
  qc?: CRUDPermission;
  payments?: CRUDPermission;
  approvals?: CRUDPermission;
  reports?: CRUDPermission;
  users?: CRUDPermission;
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

// All modules with their labels
const allModules: { key: keyof ManagerPermissions; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'View dashboard analytics and stats' },
  { key: 'vendors', label: 'Vendors', description: 'Manage vendor records' },
  { key: 'tailors', label: 'Tailors', description: 'Manage tailor workforce' },
  { key: 'styles', label: 'Styles', description: 'Manage style catalog' },
  { key: 'fabricCutting', label: 'Fabric & Cutting', description: 'Track fabric cutting records' },
  { key: 'distribution', label: 'Distribution', description: 'Assign work to tailors' },
  { key: 'production', label: 'Production', description: 'Track production progress' },
  { key: 'shipments', label: 'Shipments', description: 'Manage shipments to vendors' },
  { key: 'rates', label: 'Rates & Profit', description: 'Set rates and view profit' },
  { key: 'inventory', label: 'Inventory', description: 'Manage raw materials inventory' },
  { key: 'qc', label: 'Quality Control', description: 'QC inspections and checklists' },
  { key: 'payments', label: 'Payments', description: 'Tailor payment tracking' },
  { key: 'approvals', label: 'Approvals', description: 'Review and approve requests' },
  { key: 'reports', label: 'Reports', description: 'Generate and view reports' },
  { key: 'users', label: 'Users', description: 'Manage system users' },
];

// CRUD operations
const crudOperations: { key: keyof CRUDPermission; label: string; icon: typeof Eye; color: string }[] = [
  { key: 'create', label: 'Create', icon: FilePlus, color: 'text-green-600' },
  { key: 'read', label: 'Read', icon: Eye, color: 'text-blue-600' },
  { key: 'update', label: 'Update', icon: FileEdit, color: 'text-amber-600' },
  { key: 'delete', label: 'Delete', icon: Trash, color: 'text-red-600' },
];

// Helper to check if module has any permission
const hasAnyPermission = (perm?: CRUDPermission): boolean => {
  if (!perm) return false;
  return !!(perm.create || perm.read || perm.update || perm.delete);
};

// Helper to check if module has full access
const hasFullAccess = (perm?: CRUDPermission): boolean => {
  if (!perm) return false;
  return !!(perm.create && perm.read && perm.update && perm.delete);
};

// Count total permissions
const countPermissions = (permissions?: ManagerPermissions): { modules: number; operations: number } => {
  if (!permissions) return { modules: 0, operations: 0 };
  let modules = 0;
  let operations = 0;
  for (const key of Object.keys(permissions) as (keyof ManagerPermissions)[]) {
    const perm = permissions[key];
    if (hasAnyPermission(perm)) {
      modules++;
      if (perm?.create) operations++;
      if (perm?.read) operations++;
      if (perm?.update) operations++;
      if (perm?.delete) operations++;
    }
  }
  return { modules, operations };
};

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

      if (formData.password) {
        payload.password = formData.password;
      }

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

  // Toggle single CRUD permission
  const toggleCRUDPermission = (moduleKey: keyof ManagerPermissions, operation: keyof CRUDPermission) => {
    if (!permissionsUser) return;
    const currentModule = permissionsUser.permissions?.[moduleKey] || {};
    setPermissionsUser({
      ...permissionsUser,
      permissions: {
        ...permissionsUser.permissions,
        [moduleKey]: {
          ...currentModule,
          [operation]: !currentModule[operation],
        },
      },
    });
  };

  // Toggle all CRUD for a module
  const toggleModuleFullAccess = (moduleKey: keyof ManagerPermissions) => {
    if (!permissionsUser) return;
    const currentModule = permissionsUser.permissions?.[moduleKey];
    const hasAll = hasFullAccess(currentModule);
    setPermissionsUser({
      ...permissionsUser,
      permissions: {
        ...permissionsUser.permissions,
        [moduleKey]: hasAll
          ? { create: false, read: false, update: false, delete: false }
          : { create: true, read: true, update: true, delete: true },
      },
    });
  };

  // Set all modules to full access
  const setAllFullAccess = () => {
    if (!permissionsUser) return;
    const allPerms: ManagerPermissions = {};
    allModules.forEach((m) => {
      allPerms[m.key] = { create: true, read: true, update: true, delete: true };
    });
    setPermissionsUser({ ...permissionsUser, permissions: allPerms });
  };

  // Set all modules to read only
  const setAllReadOnly = () => {
    if (!permissionsUser) return;
    const allPerms: ManagerPermissions = {};
    allModules.forEach((m) => {
      allPerms[m.key] = { create: false, read: true, update: false, delete: false };
    });
    setPermissionsUser({ ...permissionsUser, permissions: allPerms });
  };

  // Clear all permissions
  const clearAllPermissions = () => {
    if (!permissionsUser) return;
    setPermissionsUser({ ...permissionsUser, permissions: {} });
  };

  // Toggle CRUD for form data (when creating user)
  const toggleFormCRUD = (moduleKey: keyof ManagerPermissions, operation: keyof CRUDPermission) => {
    const currentModule = formData.permissions[moduleKey] || {};
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [moduleKey]: {
          ...currentModule,
          [operation]: !currentModule[operation],
        },
      },
    });
  };

  // Toggle full access for form data
  const toggleFormModuleFullAccess = (moduleKey: keyof ManagerPermissions) => {
    const currentModule = formData.permissions[moduleKey];
    const hasAll = hasFullAccess(currentModule);
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [moduleKey]: hasAll
          ? { create: false, read: false, update: false, delete: false }
          : { create: true, read: true, update: true, delete: true },
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

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Users"
        subtitle="Manage system users, roles, and granular permissions"
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
                  <TableHead>Access Level</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableEmpty message="No users found" colSpan={7} />
                ) : (
                  filteredUsers.map((user) => {
                    const permCount = countPermissions(user.permissions);
                    return (
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
                            <div className="text-sm">
                              <span className="font-medium">{permCount.modules}</span>
                              <span className="text-surface-500"> modules, </span>
                              <span className="font-medium">{permCount.operations}</span>
                              <span className="text-surface-500"> permissions</span>
                            </div>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-sm text-red-600 font-medium">Full Access (Superuser)</span>
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
                                title="Manage CRUD Permissions"
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-surface-900 dark:text-surface-50">
                  Manager Role - Granular CRUD Permissions
                </h3>
                <ul className="text-sm text-surface-600 dark:text-surface-400 mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Create (C)</strong> - Can add new records</li>
                  <li><strong>Read (R)</strong> - Can view and access the module</li>
                  <li><strong>Update (U)</strong> - Can modify existing records (requires admin approval)</li>
                  <li><strong>Delete (D)</strong> - Can remove records (requires admin approval)</li>
                  <li>Click the shield icon to manage a manager&apos;s detailed permissions</li>
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
              <label className="label">Access Permissions (CRUD)</label>
              <p className="text-xs text-surface-500 mb-3">
                Select which modules and operations this manager can access
              </p>
              <div className="max-h-64 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50 dark:bg-surface-800 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Module</th>
                      <th className="text-center p-2 w-16">
                        <span className="text-green-600" title="Create">C</span>
                      </th>
                      <th className="text-center p-2 w-16">
                        <span className="text-blue-600" title="Read">R</span>
                      </th>
                      <th className="text-center p-2 w-16">
                        <span className="text-amber-600" title="Update">U</span>
                      </th>
                      <th className="text-center p-2 w-16">
                        <span className="text-red-600" title="Delete">D</span>
                      </th>
                      <th className="text-center p-2 w-16">All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allModules.map((module) => {
                      const perm = formData.permissions[module.key] || {};
                      return (
                        <tr key={module.key} className="border-t border-surface-100 dark:border-surface-700">
                          <td className="p-2">{module.label}</td>
                          {crudOperations.map((op) => (
                            <td key={op.key} className="text-center p-2">
                              <input
                                type="checkbox"
                                checked={perm[op.key] || false}
                                onChange={() => toggleFormCRUD(module.key, op.key)}
                                className="w-4 h-4 rounded"
                              />
                            </td>
                          ))}
                          <td className="text-center p-2">
                            <button
                              type="button"
                              onClick={() => toggleFormModuleFullAccess(module.key)}
                              className={`p-1 rounded ${
                                hasFullAccess(perm)
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-surface-100 text-surface-400 dark:bg-surface-700'
                              }`}
                            >
                              {hasFullAccess(perm) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

      {/* Detailed Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setPermissionsUser(null);
        }}
        title={`Manage Permissions - ${permissionsUser?.name}`}
        size="lg"
      >
        {permissionsUser && (
          <div className="space-y-4">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Configure granular CRUD (Create, Read, Update, Delete) permissions for each module.
              Update and Delete operations by managers require admin approval.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <Button type="button" size="sm" variant="secondary" onClick={setAllFullAccess}>
                Full Access (All)
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={setAllReadOnly}>
                Read Only (All)
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearAllPermissions}>
                Clear All
              </Button>
            </div>

            {/* Permission Matrix */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-100 dark:bg-surface-800">
                    <tr>
                      <th className="text-left p-3 font-medium min-w-[150px]">Module</th>
                      {crudOperations.map((op) => (
                        <th key={op.key} className="text-center p-3 w-24">
                          <div className="flex flex-col items-center gap-1">
                            <op.icon className={`w-4 h-4 ${op.color}`} />
                            <span className={op.color}>{op.label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-3 w-24">Full Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allModules.map((module, idx) => {
                      const perm = permissionsUser.permissions?.[module.key] || {};
                      const isFullAccess = hasFullAccess(perm);
                      return (
                        <tr
                          key={module.key}
                          className={`border-t border-surface-100 dark:border-surface-700 ${
                            idx % 2 === 0 ? 'bg-white dark:bg-surface-900' : 'bg-surface-50 dark:bg-surface-800/50'
                          }`}
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{module.label}</p>
                              <p className="text-xs text-surface-500">{module.description}</p>
                            </div>
                          </td>
                          {crudOperations.map((op) => (
                            <td key={op.key} className="text-center p-3">
                              <button
                                type="button"
                                onClick={() => toggleCRUDPermission(module.key, op.key)}
                                className={`p-2 rounded-lg transition-colors ${
                                  perm[op.key]
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                    : 'bg-surface-100 dark:bg-surface-700 text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600'
                                }`}
                              >
                                {perm[op.key] ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                              </button>
                            </td>
                          ))}
                          <td className="text-center p-3">
                            <button
                              type="button"
                              onClick={() => toggleModuleFullAccess(module.key)}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                isFullAccess
                                  ? 'bg-green-600 text-white'
                                  : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300'
                              }`}
                            >
                              {isFullAccess ? 'Full' : 'None'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-surface-500 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <div className="flex items-center gap-1">
                <FilePlus className="w-3 h-3 text-green-600" />
                <span>Create - Add new records</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-blue-600" />
                <span>Read - View module & data</span>
              </div>
              <div className="flex items-center gap-1">
                <FileEdit className="w-3 h-3 text-amber-600" />
                <span>Update - Modify records (needs approval)</span>
              </div>
              <div className="flex items-center gap-1">
                <Trash className="w-3 h-3 text-red-600" />
                <span>Delete - Remove records (needs approval)</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
        )}
      </Modal>
    </div>
  );
}
