'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ToastProvider } from './ui/toast';
import { ThemeProvider } from './theme-provider';
import { I18nProvider } from './i18n-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
