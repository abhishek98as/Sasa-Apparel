import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

