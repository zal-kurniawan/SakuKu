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
  Menu,
  X,
  Plus,
  FileSpreadsheet,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white tracking-tight">
                    {t('app.title')}
                  </span>
                  <Link
                    href="/admin/qr"
                    title="Scan QR / Status Bot WhatsApp"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                  >
                    <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-pulse text-emerald-500" />
                    <span>WA Bot</span>
                  </Link>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
                  {t('app.subtitle')}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop & Tablet Navigation Controls */}
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
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              title="Ganti Bahasa / Switch Language"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition min-h-[38px]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase">{locale}</span>
            </button>

            {/* Theme Switcher */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle Dark / Light Mode"
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

          {/* Mobile Right Controls: Language + Theme + Hamburger Menu */}
          <div className="flex md:hidden items-center space-x-1.5">
            {/* Language Switcher */}
            <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              title={t('nav.switchLanguage') || 'Ganti Bahasa'}
              className="p-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <span className="uppercase text-[11px]">{locale}</span>
            </button>

            {/* Theme Switcher */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={t('nav.toggleTheme') || 'Toggle Mode'}
                className="p-2 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-700" />
                )}
              </button>
            )}

            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t('nav.openMenu') || 'Buka Menu'}
              className="p-2 rounded-xl text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sliding Sheet / Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sliding Sheet Panel */}
          <div className="relative w-full max-w-xs bg-white dark:bg-gray-900 h-full shadow-2xl p-6 flex flex-col justify-between border-l border-gray-200 dark:border-gray-800 animate-in slide-in-from-right duration-250 z-10 overflow-y-auto">
            <div>
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      {t('app.title')}
                    </h3>
                    <p className="text-[11px] text-gray-400">{t('nav.mobileMenuSubtitle') || 'Menu & Aksi Cepat'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons List in Mobile Drawer */}
              <div className="py-4 space-y-2.5">
                {/* Catat Transaksi */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAddTransaction();
                  }}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-3 shadow-sm transition active:scale-98"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{t('transactions.addTransaction')}</span>
                </button>

                {/* Transfer Saldo */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenTransfer();
                  }}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-sm flex items-center gap-3 transition active:scale-98"
                >
                  <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                  <span>{t('wallets.transfer')}</span>
                </button>

                {/* Import Excel */}
                <Link
                  href="/import"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium text-sm flex items-center gap-3 transition"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.importExcel') || 'Import Excel'}</span>
                </Link>

                {/* Status Bot WhatsApp */}
                <Link
                  href="/admin/qr"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium text-sm flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3">
                    <Radio className="w-5 h-5 text-emerald-500" />
                    <span>{t('nav.waBotStatus') || 'Status Bot WhatsApp'}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-500" />
                    <span>WA Bot</span>
                  </span>
                </Link>

                {/* Panduan WhatsApp Bot */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenGuide();
                  }}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium text-sm flex items-center gap-3 transition"
                >
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <span>{t('nav.botGuide')}</span>
                </button>
              </div>

              {/* Language & Theme Controls inside Drawer */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 px-1">
                  <span>{t('nav.switchLanguage') || 'Bahasa'}</span>
                  <button
                    onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 uppercase border border-gray-200 dark:border-gray-700"
                  >
                    {locale === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
                  </button>
                </div>
                {mounted && (
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 px-1">
                    <span>{t('nav.toggleTheme') || 'Tema'}</span>
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center gap-1.5 border border-gray-200 dark:border-gray-700"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Dark</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5 text-gray-600" />
                          <span>Light</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Info */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400">
              <p>SakuKu Finance Tracker</p>
              <p className="text-[10px] mt-0.5">{t('nav.mobileFooter') || 'Versi Mobile • Cloud Sync'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Mobile (< 640px) */}
      <button
        onClick={onOpenAddTransaction}
        aria-label={t('transactions.quickAdd') || 'Catat Transaksi Cepat'}
        title={t('transactions.quickAdd') || 'Catat Transaksi Cepat'}
        className="fixed bottom-5 right-5 z-40 sm:hidden h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-90 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center transition-all duration-200"
      >
        <Plus className="w-7 h-7" />
      </button>
    </>
  );
};
