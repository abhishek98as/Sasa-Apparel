'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Search, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-100">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 hover:bg-surface-100 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-xl font-semibold text-surface-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-surface-500">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actions}
          
          <button className="p-2 hover:bg-surface-100 rounded-lg relative">
            <Bell className="w-5 h-5 text-surface-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}

