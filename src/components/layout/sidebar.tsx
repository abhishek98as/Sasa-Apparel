'use client';

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
  Settings,
  LogOut,
  UserCircle,
  Building2,
  Shirt,
  Truck,
  ClipboardList,
  CircleDollarSign,
  X,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/vendors', label: 'Vendors', icon: Building2 },
  { href: '/admin/styles', label: 'Styles', icon: Shirt },
  { href: '/admin/tailors', label: 'Tailors', icon: Users },
  { href: '/admin/fabric-cutting', label: 'Fabric & Cutting', icon: Scissors },
  { href: '/admin/distribution', label: 'Distribution', icon: ClipboardList },
  { href: '/admin/production', label: 'Production', icon: Package },
  { href: '/admin/shipments', label: 'Shipments', icon: Truck },
  { href: '/admin/rates', label: 'Rates & Profit', icon: CircleDollarSign },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: UserCircle },
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

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen } = useLayout();

  const role = session?.user?.role;
  
  const navItems =
    role === 'admin'
      ? adminNavItems
      : role === 'vendor'
      ? vendorNavItems
      : tailorNavItems;

  const roleLabel =
    role === 'admin' ? 'Administrator' : role === 'vendor' ? 'Vendor Portal' : 'Tailor Portal';

  const roleColor =
    role === 'admin'
      ? 'bg-primary-600'
      : role === 'vendor'
      ? 'bg-blue-600'
      : 'bg-accent-600';

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
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 flex flex-col h-screen transform transition-transform duration-300 ease-in-out lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={handleLinkClick}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', roleColor)}>
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">Sasa Apparel</h1>
              <p className="text-xs text-surface-500">{roleLabel}</p>
            </div>
          </Link>
          {/* Close button for mobile */}
          <button
            className="lg:hidden p-2 hover:bg-surface-100 rounded-lg"
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
        <div className="p-4 border-t border-surface-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-surface-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full sidebar-link text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

