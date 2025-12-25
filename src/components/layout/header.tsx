'use client';

import { useEffect, useState } from 'react';
import { Bell, Menu, Moon, Sun, Globe } from 'lucide-react';
import { IKContext, IKImage } from 'imagekitio-react';
import { useLayout } from './layout-context';
import { useBrand } from './brand-context';
import { useTheme } from '../theme-provider';
import { useI18n } from '../i18n-provider';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar } = useLayout();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const { brandSettings } = useBrand();

  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/d6s8a2mzi';
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '';

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'hi' : 'en');
  };

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
          
          {/* Brand Logo */}
          {brandSettings.brandLogo && (
            <IKContext
              publicKey={publicKey}
              urlEndpoint={urlEndpoint}
            >
              <div className="h-10 w-10 relative flex-shrink-0">
                <IKImage
                  path={brandSettings.brandLogo}
                  alt={brandSettings.brandName || 'Brand Logo'}
                  width="40"
                  height="40"
                  className="object-contain rounded"
                />
              </div>
            </IKContext>
          )}

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-surface-900 dark:text-surface-50 truncate">
              {brandSettings.brandName || title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-surface-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {actions}
          
          {/* Language Toggle */}
          <button
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg flex items-center gap-1"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            title={locale === 'en' ? 'Switch to Hindi' : 'Switch to English'}
          >
            <Globe className="w-5 h-5 text-surface-500" />
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400 uppercase">
              {locale}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-surface-600" />
            )}
          </button>

          <button className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg relative">
            <Bell className="w-5 h-5 text-surface-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}

