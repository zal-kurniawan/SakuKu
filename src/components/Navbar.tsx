'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/context/LanguageContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import {
  Wallet,
  Sun,
  Moon,
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
  useModalEscape({
    isOpen: isSpeedDialOpen,
    onClose: () => setIsSpeedDialOpen(false),
  });

  const iconControlClass =
    'h-9 w-9 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer shrink-0';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name Area */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:scale-105 transition-transform duration-200 shrink-0"
              title={t('app.title')}
              aria-label={t('app.title')}
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none whitespace-nowrap hover:opacity-90 transition-opacity"
                >
                  {t('app.title')}
                </Link>
                <button
                  type="button"
                  onClick={onOpenBotLinker}
                  title={t('botLinker.title') || 'Status Bot WhatsApp'}
                  aria-label={t('botLinker.title') || 'Status Bot WhatsApp'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  WA Bot
                </button>
              </div>
              <p className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Controls (>= 768px / md:flex) */}
          <div className="hidden md:flex items-center gap-2 lg:gap-2.5">
            {/* Quick Add Transaction */}
            <button
              type="button"
              onClick={onOpenAddTransaction}
              className="inline-flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-98 whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{t('transactions.addTransaction')}</span>
            </button>

            {/* Quick Transfer */}
            <button
              type="button"
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition active:scale-98 whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
              <span>{t('wallets.transfer')}</span>
            </button>

            {/* 3 Unified Control Buttons: Guide, Language, Theme */}
            <div className="flex items-center gap-1 pl-1">
              {/* 1. Bot Guide */}
              <button
                type="button"
                onClick={onOpenGuide}
                title={t('nav.botGuide')}
                aria-label={t('nav.botGuide')}
                className={iconControlClass}
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* 2. Language Switcher (100% same styling) */}
              <button
                type="button"
                onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
                title={t('nav.switchLanguage') || 'Ganti Bahasa'}
                aria-label={t('nav.switchLanguage') || 'Ganti Bahasa'}
                className={`${iconControlClass} text-xs font-bold tracking-wide uppercase`}
              >
                <span>{locale}</span>
              </button>

              {/* 3. Theme Switcher */}
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title={t('nav.toggleTheme') || 'Toggle Mode'}
                  aria-label={t('nav.toggleTheme') || 'Toggle Mode'}
                  className={iconControlClass}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Right Controls: Only 3 Clean Buttons (Language, Theme, Guide) (< 768px) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* 1. Language Switcher */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              title={t('nav.switchLanguage') || 'Ganti Bahasa'}
              aria-label={t('nav.switchLanguage') || 'Ganti Bahasa'}
              className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-bold tracking-wide uppercase active:scale-95"
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
                className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            )}

            {/* 3. Bot Guide Button */}
            <button
              type="button"
              onClick={onOpenGuide}
              title={t('nav.botGuide') || 'Panduan Bot'}
              aria-label={t('nav.botGuide') || 'Panduan Bot'}
              className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
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
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSpeedDialOpen(false);
            }}
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
