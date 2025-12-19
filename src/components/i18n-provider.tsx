'use client';

import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

type Locale = 'en' | 'hi';

type Messages = Record<string, string>;

const dictionary: Record<Locale, Messages> = {
  en: {
    'welcome.back': 'Welcome back',
    'sign.in': 'Sign in to your account',
    'email': 'Email address',
    'password': 'Password',
    'sign.out': 'Sign out',
    'dashboard': 'Dashboard',
  },
  hi: {
    'welcome.back': 'वापसी पर स्वागत है',
    'sign.in': 'अपने खाते में साइन इन करें',
    'email': 'ईमेल पता',
    'password': 'पासवर्ड',
    'sign.out': 'साइन आउट',
    'dashboard': 'डैशबोर्ड',
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = (key: string) => {
    const messages = dictionary[locale] || dictionary.en;
    return messages[key] || dictionary.en[key] || key;
  };

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

