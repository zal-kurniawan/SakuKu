'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/context/LanguageContext';
import {
  Wallet,
  Sun,
  Moon,
  Globe,
  Radio,
  BookOpen,
  ArrowRightLeft,
  PlusCircle,
  FileSpreadsheet,
  QrCode,
} from 'lucide-react';

interface NavbarProps {
  onOpenTransfer: () => void;
  onOpenAddTransaction: () => void;
  onOpenGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTransfer,
  onOpenAddTransaction,
  onOpenGuide,
}) => {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
                {t('app.title')}
              </span>
              <Link
                href="/admin/qr"
                title="Scan QR / Status Bot WhatsApp"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
              >
                <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                WA Bot
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {t('app.subtitle')}
            </p>
          </div>
        </div>

        {/* Action Buttons & Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Add Transaction */}
          <button
            onClick={onOpenAddTransaction}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('transactions.addTransaction')}</span>
          </button>

          {/* Quick Transfer */}
          <button
            onClick={onOpenTransfer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('wallets.transfer')}</span>
          </button>

          {/* Excel Bulk Import */}
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition shadow-xs"
            title="Import Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">{t('nav.importExcel')}</span>
          </Link>

          {/* Bot Guide */}
          <button
            onClick={onOpenGuide}
            title={t('nav.botGuide')}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
            title="Ganti Bahasa / Switch Language"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase">{locale}</span>
          </button>

          {/* Theme Switcher */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Dark / Light Mode"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
