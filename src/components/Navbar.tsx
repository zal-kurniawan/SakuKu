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
  Plus,
} from 'lucide-react';

interface NavbarProps {
  onOpenTransfer: () => void;
  onOpenAddTransaction: () => void;
  onOpenGuide: () => void;
  onOpenBotLinker: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTransfer,
  onOpenAddTransaction,
  onOpenGuide,
  onOpenBotLinker,
}) => {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close speed dial when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSpeedDialOpen) setIsSpeedDialOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpeedDialOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white tracking-tight">
                      {t('app.title')}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
                    {t('app.subtitle')}
                  </p>
                </div>
              </Link>

              {/* WA Bot Badge Trigger Button (Desktop & Mobile) */}
              <button
                type="button"
                onClick={onOpenBotLinker}
                title={t('botLinker.title') || 'Status Bot WhatsApp'}
                aria-label={t('botLinker.title') || 'Status Bot WhatsApp'}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer active:scale-95"
              >
                <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-pulse text-emerald-500 shrink-0" />
                <span>WA Bot</span>
              </button>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Controls (>= 768px / md:flex) */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-2.5">
            {/* Quick Add Transaction */}
            <button
              onClick={onOpenAddTransaction}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-98 min-h-[38px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('transactions.addTransaction')}</span>
            </button>

            {/* Quick Transfer */}
            <button
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition active:scale-98 min-h-[38px]"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t('wallets.transfer')}</span>
            </button>

            {/* Bot Guide */}
            <button
              onClick={onOpenGuide}
              title={t('nav.botGuide')}
              aria-label={t('nav.botGuide')}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              title={t('nav.switchLanguage') || 'Ganti Bahasa'}
              aria-label={t('nav.switchLanguage') || 'Ganti Bahasa'}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition min-h-[38px]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase">{locale}</span>
            </button>

            {/* Theme Switcher */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={t('nav.toggleTheme') || 'Toggle Mode'}
                aria-label={t('nav.toggleTheme') || 'Toggle Mode'}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-700" />
                )}
              </button>
            )}
          </div>

          {/* Mobile Right Controls: Only 3 Clean Buttons (Language, Theme, Guide) (< 768px) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* 1. Language Switcher Pill */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              title={t('nav.switchLanguage') || 'Ganti Bahasa'}
              aria-label={t('nav.switchLanguage') || 'Ganti Bahasa'}
              className="h-8 px-2.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition uppercase flex items-center justify-center active:scale-95"
            >
              <span>{locale}</span>
            </button>

            {/* 2. Theme Switcher */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={t('nav.toggleTheme') || 'Toggle Mode'}
                aria-label={t('nav.toggleTheme') || 'Toggle Mode'}
                className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center active:scale-95"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-700" />
                )}
              </button>
            )}

            {/* 3. Bot Guide Button */}
            <button
              type="button"
              onClick={onOpenGuide}
              title={t('nav.botGuide') || 'Panduan Bot'}
              aria-label={t('nav.botGuide') || 'Panduan Bot'}
              className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Speed-Dial Floating Action Menu for Mobile (< 768px / md:hidden) */}
      <div className="fixed bottom-5 right-5 z-40 md:hidden flex flex-col items-end">
        {/* Backdrop */}
        {isSpeedDialOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsSpeedDialOpen(false)}
          />
        )}

        {/* Speed-Dial Actions (Vertical Stack above FAB) */}
        {isSpeedDialOpen && (
          <div className="flex flex-col items-end gap-3 mb-3 z-40 animate-in slide-in-from-bottom-3 duration-200">
            {/* 1. Transfer Funds / Transfer Saldo */}
            <div className="flex items-center gap-2.5">
              <span className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-3.5 py-2 rounded-xl shadow-lg text-xs font-medium whitespace-nowrap select-none">
                {t('nav.transferFunds') || 'Transfer Saldo'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  onOpenTransfer();
                }}
                aria-label={t('nav.transferFunds') || 'Transfer Saldo'}
                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center transition active:scale-95"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Add Transaction / Catat Transaksi */}
            <div className="flex items-center gap-2.5">
              <span className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-3.5 py-2 rounded-xl shadow-lg text-xs font-medium whitespace-nowrap select-none">
                {t('nav.addTransaction') || 'Catat Transaksi'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  onOpenAddTransaction();
                }}
                aria-label={t('nav.addTransaction') || 'Catat Transaksi'}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition active:scale-95"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Trigger FAB */}
        <button
          type="button"
          onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
          aria-label={t('transactions.quickAdd') || 'Menu Aksi Cepat'}
          title={t('transactions.quickAdd') || 'Menu Aksi Cepat'}
          className={`relative z-40 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-90 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center transition-all duration-200 ${
            isSpeedDialOpen ? 'rotate-45 bg-gray-800 dark:bg-gray-700 shadow-none' : ''
          }`}
        >
          <Plus className="w-7 h-7 transition-transform duration-200" />
        </button>
      </div>
    </>
  );
};
