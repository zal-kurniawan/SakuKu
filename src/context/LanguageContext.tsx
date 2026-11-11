'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import idTranslations from '../locales/id.json';
import enTranslations from '../locales/en.json';

type Locale = 'id' | 'en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const dictionaries: Record<Locale, Record<string, any>> = {
  id: idTranslations,
  en: enTranslations,
};

const LanguageContext = createContext<LanguageContextType>({
  locale: 'id',
  setLocale: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>('id');

  useEffect(() => {
    const saved = localStorage.getItem('app_locale') as Locale | null;
    if (saved && (saved === 'id' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('app_locale', newLocale);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = dictionaries[locale] || dictionaries.id;
    const parts = key.split('.');
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback || key;
      }
    }

    return typeof current === 'string' ? current : (fallback || key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
