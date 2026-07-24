'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '@/i18n/en.json';
import mk from '@/i18n/mk.json';

export type Locale = 'en' | 'mk';

const dictionaries: Record<Locale, any> = { mk, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'mk',
  setLocale: () => {},
  t: (path) => path,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('mk');

  useEffect(() => {
    const saved = localStorage.getItem('imfex_locale') as Locale;
    if (saved && (saved === 'en' || saved === 'mk')) {
      setLocaleState(saved);
    } else {
      // Default to Macedonian
      setLocaleState('mk');
      localStorage.setItem('imfex_locale', 'mk');
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('imfex_locale', l);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = dictionaries[locale] || dictionaries.mk;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Macedonian or English if key missing
        let fb: any = dictionaries.mk || dictionaries.en;
        for (const k of keys) {
          if (fb && typeof fb === 'object' && k in fb) fb = fb[k];
          else return path;
        }
        return typeof fb === 'string' ? fb : path;
      }
    }
    return typeof current === 'string' ? current : path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
