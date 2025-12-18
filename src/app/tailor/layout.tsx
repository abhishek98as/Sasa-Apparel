'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { LayoutProvider } from '@/components/layout/layout-context';

export default function TailorLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <div className="flex min-h-screen bg-surface-50">
        <Sidebar />
        <main className="flex-1 overflow-auto lg:ml-0 min-w-0">{children}</main>
      </div>
    </LayoutProvider>
  );
}

