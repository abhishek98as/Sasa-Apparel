'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ToastProvider } from './ui/toast';
import { ThemeProvider } from './theme-provider';
import { I18nProvider } from './i18n-provider';
import { BrandProvider } from './layout/brand-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ThemeProvider>
          <BrandProvider>
            <ToastProvider>{children}</ToastProvider>
          </BrandProvider>
        </ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
