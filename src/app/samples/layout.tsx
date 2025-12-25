'use client';

import { LayoutProvider } from '@/components/layout/layout-context';
import { Sidebar } from '@/components/layout/sidebar';

export default function SamplesLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <div className="flex h-screen bg-surface-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </LayoutProvider>
  );
}
