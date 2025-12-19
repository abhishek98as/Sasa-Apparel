'use client';

import { useSession } from 'next-auth/react';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useLayout } from './layout-context';
import { useTheme } from '../theme-provider';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession();
  const { toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-surface-100 dark:bg-surface-900 dark:border-surface-800">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            className="lg:hidden p-2 hover:bg-surface-100 rounded-lg -ml-2"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-surface-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-surface-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-surface-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {actions}
          <button
            className="p-2 hover:bg-surface-100 rounded-lg"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-surface-600" />
            )}
          </button>

          <button className="p-2 hover:bg-surface-100 rounded-lg relative">
            <Bell className="w-5 h-5 text-surface-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}

