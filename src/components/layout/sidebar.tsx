'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useLayout } from './layout-context';
import {
  LayoutDashboard,
  Users,
  Scissors,
  Package,
  TrendingUp,
  FileText,
  LogOut,
  UserCircle,
  Building2,
  Shirt,
  Truck,
  ClipboardList,
  CircleDollarSign,
  X,
  Boxes,
  ShieldCheck,
  Wallet,
  BadgeCheck,
  PackageCheck,
  Settings,
} from 'lucide-react';

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

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permissionKey?: keyof ManagerPermissions;
}

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissionKey: 'dashboard' },
  { href: '/admin/vendors', label: 'Vendors', icon: Building2, permissionKey: 'vendors' },
  { href: '/admin/styles', label: 'Styles', icon: Shirt, permissionKey: 'styles' },
  { href: '/admin/tailors', label: 'Tailors', icon: Users, permissionKey: 'tailors' },
  { href: '/admin/fabric-cutting', label: 'Fabric & Cutting', icon: Scissors, permissionKey: 'fabricCutting' },
  { href: '/admin/distribution', label: 'Distribution', icon: ClipboardList, permissionKey: 'distribution' },
  { href: '/admin/production', label: 'Production', icon: Package, permissionKey: 'production' },
  { href: '/admin/ready-to-ship', label: 'Ready to Ship', icon: PackageCheck, permissionKey: 'shipments' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, permissionKey: 'inventory' },
  { href: '/admin/qc', label: 'Quality Control', icon: ShieldCheck, permissionKey: 'qc' },
  { href: '/admin/shipments', label: 'Shipments', icon: Truck, permissionKey: 'shipments' },
  { href: '/admin/rates', label: 'Rates & Profit', icon: CircleDollarSign, permissionKey: 'rates' },
  { href: '/admin/payments', label: 'Payments', icon: Wallet, permissionKey: 'payments' },
  { href: '/admin/approvals', label: 'Approvals', icon: BadgeCheck, permissionKey: 'approvals' },
  { href: '/admin/reports', label: 'Reports', icon: FileText, permissionKey: 'reports' },
  { href: '/admin/users', label: 'Users', icon: UserCircle, permissionKey: 'users' },
];

const vendorNavItems: NavItem[] = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/styles', label: 'My Styles', icon: Shirt },
  { href: '/vendor/shipments', label: 'Shipments', icon: Truck },
  { href: '/vendor/progress', label: 'Production Progress', icon: TrendingUp },
];

const tailorNavItems: NavItem[] = [
  { href: '/tailor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tailor/jobs', label: 'My Jobs', icon: ClipboardList },
  { href: '/tailor/history', label: 'History', icon: FileText },
];

// Helper to check if a module has at least read permission
const canAccessModule = (permissions: ManagerPermissions | null, key: keyof ManagerPermissions): boolean => {
  if (!permissions) return false;
  const perm = permissions[key];
  // Can access if has any CRUD permission (but mainly check read)
  return !!(perm?.read || perm?.create || perm?.update || perm?.delete);
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const [permissions, setPermissions] = useState<ManagerPermissions | null>(null);

  const role = session?.user?.role;

  // Fetch user permissions for managers
  useEffect(() => {
    const fetchPermissions = async () => {
      if (role === 'manager' && session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`);
          const result = await response.json();
          if (result.success && result.data?.permissions) {
            setPermissions(result.data.permissions);
          }
        } catch (error) {
          console.error('Failed to fetch permissions:', error);
        }
      }
    };

    fetchPermissions();
  }, [role, session?.user?.id]);

  // Get nav items based on role
  const getNavItems = (): NavItem[] => {
    if (role === 'admin') {
      return [...adminNavItems, { href: '/admin/settings', label: 'Settings', icon: Settings }];
    }
    if (role === 'manager') {
      // Filter items based on CRUD permissions (check if user can at least read)
      if (!permissions) {
        // If permissions not loaded yet, show only dashboard
        return adminNavItems.filter((item) => item.permissionKey === 'dashboard');
      }
      return adminNavItems.filter((item) => {
        if (!item.permissionKey) return true;
        return canAccessModule(permissions, item.permissionKey);
      });
    }
    if (role === 'vendor') {
      return vendorNavItems;
    }
    return tailorNavItems;
  };

  const navItems = getNavItems();

  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'manager'
        ? 'Manager Portal'
        : role === 'vendor'
          ? 'Vendor Portal'
          : 'Tailor Portal';

  const roleColor =
    role === 'admin'
      ? 'bg-red-600'
      : role === 'manager'
        ? 'bg-amber-600'
        : role === 'vendor'
          ? 'bg-blue-600'
          : 'bg-green-600';

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 dark:bg-surface-900 dark:border-surface-800 flex flex-col h-screen transform transition-transform duration-300 ease-in-out lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={handleLinkClick}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', roleColor)}>
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">Sasa Apparel</h1>
              <p className="text-xs text-surface-500">{roleLabel}</p>
            </div>
          </Link>
          {/* Close button for mobile */}
          <button
            className="lg:hidden p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'sidebar-link',
                  isActive && 'sidebar-link-active'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-surface-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full sidebar-link text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
