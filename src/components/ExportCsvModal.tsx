'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import {
  FileSpreadsheet,
  Download,
  X,
  Check,
  Calendar,
  Wallet,
  ArrowRightLeft,
  Search,
  Tag,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { FormFieldError } from './ui/FormFieldError';
import { WalletItem } from './WalletList';
import { getCategoryLabel } from '@/lib/categories';
import { formatDateRangeDisplay } from '@/lib/timezone';

export interface CurrentExportFilters {
  walletId: string;
  type: string;
  category: string;
  search: string;
  dateRangeFilter: string;
  dateFrom?: string;
  dateTo?: string;
  customDateFrom?: string;
  customDateTo?: string;
}

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletItem[];
  currentFilters: CurrentExportFilters;
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  onClose,
  wallets,
  currentFilters,
}) => {
  const { t, locale } = useTranslation();
  const toast = useToast();

  const [scope, setScope] = useState<'current_filter' | 'custom'>('current_filter');
  const [delimiter, setDelimiter] = useState<'comma' | 'semicolon'>('comma');

  // Custom filters state
  const [customWallet, setCustomWallet] = useState('all');
  const [customType, setCustomType] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Count & loading states
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dateError, setDateError] = useState<string | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleClose = () => {
    if (isDownloading) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setScope('current_filter');
    setDelimiter('comma');
    setCustomWallet('all');
    setCustomType('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setDateError(undefined);
    setMatchingCount(null);
    onClose();
  };

  useModalEscape({
    isOpen,
    onClose: handleClose,
    disabled: isDownloading,
  });

  // Calculate actual query params for export / count
  const buildQueryParams = (targetScope: 'current_filter' | 'custom', forCountOnly: boolean) => {
    const params = new URLSearchParams();
    if (forCountOnly) {
      params.set('countOnly', 'true');
    }

    if (delimiter === 'semicolon') {
      params.set('delimiter', 'semicolon');
    }

    if (targetScope === 'current_filter') {
      if (currentFilters.walletId && currentFilters.walletId !== 'all') {
        params.set('walletId', currentFilters.walletId);
      }
      if (currentFilters.type && currentFilters.type !== 'all') {
        params.set('type', currentFilters.type);
      }
      if (currentFilters.category && currentFilters.category !== 'all') {
        params.set('category', currentFilters.category);
      }
      if (currentFilters.search && currentFilters.search.trim()) {
        params.set('search', currentFilters.search.trim());
      }

      if (currentFilters.dateRangeFilter === 'this_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        params.set('dateFrom', firstDay);
        params.set('dateTo', lastDay);
      } else if (currentFilters.dateRangeFilter === 'last_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        params.set('dateFrom', firstDay);
        params.set('dateTo', lastDay);
      } else if (currentFilters.dateRangeFilter === 'custom') {
        if (currentFilters.customDateFrom) params.set('dateFrom', currentFilters.customDateFrom);
        if (currentFilters.customDateTo) params.set('dateTo', currentFilters.customDateTo);
      }
    } else {
      // Custom scope
      if (customWallet !== 'all') {
        params.set('walletId', customWallet);
      }
      if (customType !== 'all') {
        params.set('type', customType);
      }
      if (customDateFrom) {
        params.set('dateFrom', customDateFrom);
      }
      if (customDateTo) {
        params.set('dateTo', customDateTo);
      }
    }

    return params;
  };

  // Fetch count whenever filters change
  useEffect(() => {
    if (!isOpen) return;

    // Check date validity
    if (scope === 'custom' && customDateFrom && customDateTo && customDateFrom > customDateTo) {
      setDateError(
        t('export.invalidDateRange', locale === 'en' ? 'End date cannot be before start date.' : 'Tanggal akhir tidak boleh sebelum tanggal mulai.')
      );
      setMatchingCount(0);
      return;
    }
    setDateError(undefined);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsCounting(true);
    const params = buildQueryParams(scope, true);

    fetch(`/api/export?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setMatchingCount(data.count);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to count export transactions:', err);
        }
      })
      .finally(() => {
        setIsCounting(false);
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, scope, customWallet, customType, customDateFrom, customDateTo, currentFilters]);

  const handleStartDateChange = (val: string) => {
    setCustomDateFrom(val);
    if (customDateTo && val > customDateTo) {
      setCustomDateTo(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setCustomDateTo(val);
  };

  const handleDownload = async () => {
    if (matchingCount === 0 || isDownloading) return;

    setIsDownloading(true);
    try {
      const params = buildQueryParams(scope, false);
      const res = await fetch(`/api/export?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t('export.downloadFailed', 'Gagal mengunduh berkas CSV.'));
      }

      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `SakuKu_Transactions_${dateStr}.csv`;

      // Trigger instant safe download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(
        t('export.downloadSuccess', locale === 'en' ? 'CSV file downloaded successfully.' : 'Berkas CSV berhasil diunduh.')
      );
      handleClose();
    } catch (err: any) {
      toast.error(err.message || t('export.downloadFailed', 'Gagal mengunduh berkas CSV.'));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  // Compute chips for current table filter
  const currentFilterChips: { label: string; icon?: React.ReactNode }[] = [];
  if (currentFilters.walletId && currentFilters.walletId !== 'all') {
    const w = wallets.find((item) => item.id === currentFilters.walletId);
    currentFilterChips.push({
      label: `${t('export.chipWallet', locale === 'en' ? 'Wallet' : 'Dompet')}: ${w?.name || currentFilters.walletId}`,
    });
  }
  if (currentFilters.type && currentFilters.type !== 'all') {
    const typeLabel =
      currentFilters.type === 'INCOME'
        ? t('transactions.income', locale === 'en' ? 'Income' : 'Pemasukan')
        : currentFilters.type === 'EXPENSE'
        ? t('transactions.expense', locale === 'en' ? 'Expense' : 'Pengeluaran')
        : t('transactions.transfer', 'Transfer');
    currentFilterChips.push({
      label: `${t('export.chipType', locale === 'en' ? 'Type' : 'Tipe')}: ${typeLabel}`,
    });
  }
  if (currentFilters.category && currentFilters.category !== 'all') {
    currentFilterChips.push({
      label: `${t('export.chipCategory', locale === 'en' ? 'Category' : 'Kategori')}: ${getCategoryLabel(currentFilters.category, locale, t)}`,
    });
  }
  if (currentFilters.search && currentFilters.search.trim()) {
    currentFilterChips.push({
      label: `"${currentFilters.search.trim()}"`,
    });
  }
  if (currentFilters.dateRangeFilter === 'this_month') {
    currentFilterChips.push({
      label: t('transactions.thisMonth', locale === 'en' ? 'This Month' : 'Bulan Ini'),
    });
  } else if (currentFilters.dateRangeFilter === 'last_month') {
    currentFilterChips.push({
      label: t('transactions.lastMonth', locale === 'en' ? 'Last Month' : 'Bulan Lalu'),
    });
  } else if (currentFilters.dateRangeFilter === 'custom') {
    if (currentFilters.customDateFrom || currentFilters.customDateTo) {
      currentFilterChips.push({
        label: `${currentFilters.customDateFrom || '...'} – ${currentFilters.customDateTo || '...'}`,
      });
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filenamePreview = `SakuKu_Transactions_${dateStr}.csv`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDownloading) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl bg-white dark:bg-[#131b2c] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0 pr-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/50 dark:border-emerald-800/60">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                {t('export.title', locale === 'en' ? 'Export Transaction History (CSV)' : 'Export Riwayat Transaksi (CSV)')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t(
                  'export.subtitle',
                  locale === 'en'
                    ? 'Confirm data scope and period before downloading the file'
                    : 'Konfirmasi cakupan data dan periode sebelum mengunduh berkas'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDownloading}
            aria-label={t('common.close', locale === 'en' ? 'Close' : 'Tutup')}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 sakuku-scrollbar">
          {/* Section 1: Export Scope (2 Selectable Cards) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {t('export.scopeLabel', locale === 'en' ? 'Data Scope' : 'Cakupan Data')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* Option 1: Current Table Filter */}
              <button
                type="button"
                onClick={() => setScope('current_filter')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
                  scope === 'current_filter'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                    : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold">
                      {t('export.scopeCurrent', locale === 'en' ? 'Current Table Filter' : 'Sesuai Filter Aktif Tabel')}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {t(
                        'export.scopeCurrentDesc',
                        locale === 'en'
                          ? 'Follows filters currently active on the table'
                          : 'Sesuai filter yang sedang aktif pada tabel'
                      )}
                    </div>
                  </div>
                  {scope === 'current_filter' && (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Filter summary chips */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {currentFilterChips.length > 0 ? (
                    currentFilterChips.map((chip, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"
                      >
                        {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {t('export.allTransactions', locale === 'en' ? 'All Transactions (No Filter)' : 'Semua Transaksi (Tanpa Filter)')}
                    </span>
                  )}
                </div>
              </button>

              {/* Option 2: Custom Export */}
              <button
                type="button"
                onClick={() => setScope('custom')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
                  scope === 'custom'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                    : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold">
                      {t('export.scopeCustom', locale === 'en' ? 'Custom Export' : 'Kustomisasi Ekspor')}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {t(
                        'export.scopeCustomDesc',
                        locale === 'en'
                          ? 'Choose wallet, type, and dates specifically for this file'
                          : 'Tentukan dompet, tipe, dan tanggal khusus untuk file ini'
                      )}
                    </div>
                  </div>
                  {scope === 'custom' && (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <div className="mt-2.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {t('export.customPanelHint', locale === 'en' ? 'Independent filters' : 'Filter mandiri')}
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Custom Filter Panel (visible if scope === 'custom') */}
          {scope === 'custom' && (
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('export.walletLabel', locale === 'en' ? 'Wallet / Account' : 'Dompet / Rekening')}
                  </label>
                  <CustomSelect
                    value={customWallet}
                    onChange={setCustomWallet}
                    options={[
                      {
                        value: 'all',
                        label: t('export.allWallets', locale === 'en' ? 'All Wallets' : 'Semua Dompet'),
                      },
                      ...wallets.map((w) => ({ value: w.id, label: w.name })),
                    ]}
                    usePortal={true}
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('export.typeLabel', locale === 'en' ? 'Transaction Type' : 'Tipe Transaksi')}
                  </label>
                  <CustomSelect
                    value={customType}
                    onChange={setCustomType}
                    options={[
                      {
                        value: 'all',
                        label: t('export.allTypes', locale === 'en' ? 'All Types' : 'Semua Tipe'),
                      },
                      {
                        value: 'INCOME',
                        label: t('transactions.income', locale === 'en' ? 'Income' : 'Pemasukan'),
                      },
                      {
                        value: 'EXPENSE',
                        label: t('transactions.expense', locale === 'en' ? 'Expense' : 'Pengeluaran'),
                      },
                      {
                        value: 'TRANSFER',
                        label: t('transactions.transfer', 'Transfer'),
                      },
                    ]}
                    usePortal={true}
                    size="md"
                  />
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('export.dateFrom', locale === 'en' ? 'From Date (Optional)' : 'Dari Tanggal (Opsional)')}
                  </label>
                  <CustomDatePicker
                    value={customDateFrom}
                    onChange={handleStartDateChange}
                    placeholder={t('export.allDates', locale === 'en' ? 'All dates' : 'Seluruh tanggal')}
                    clearable={true}
                    usePortal={true}
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('export.dateTo', locale === 'en' ? 'To Date (Optional)' : 'Sampai Tanggal (Opsional)')}
                  </label>
                  <CustomDatePicker
                    value={customDateTo}
                    onChange={handleEndDateChange}
                    minDate={customDateFrom || undefined}
                    placeholder={t('export.allDates', locale === 'en' ? 'All dates' : 'Seluruh tanggal')}
                    clearable={true}
                    usePortal={true}
                    size="md"
                  />
                </div>
              </div>
              <FormFieldError message={dateError} />
            </div>
          )}

          {/* Section 3: CSV Delimiter Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {t('export.delimiterLabel', locale === 'en' ? 'CSV Delimiter (Separator)' : 'Format Pemisah Kolom CSV')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDelimiter('comma')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  delimiter === 'comma'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">
                    {t('export.delimiterComma', locale === 'en' ? 'Comma (,)' : 'Koma (,)')}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t('export.delimiterCommaSub', locale === 'en' ? 'Standard & Google Sheets' : 'Standar Umum & Google Sheets')}
                  </div>
                </div>
                {delimiter === 'comma' && (
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDelimiter('semicolon')}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  delimiter === 'semicolon'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">
                    {t('export.delimiterSemicolon', locale === 'en' ? 'Semicolon (;)' : 'Titik Koma (;)')}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t(
                      'export.delimiterSemicolonSub',
                      locale === 'en' ? 'Microsoft Excel (Indonesian Locale)' : 'Microsoft Excel (Regional Indonesia)'
                    )}
                  </div>
                </div>
                {delimiter === 'semicolon' && (
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Section 4: Export Preview Summary Box */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {t('export.summaryCountLabel', locale === 'en' ? 'Total Data to Export:' : 'Total Data yang Akan Diekspor:')}
              </span>
              <div className="font-bold flex items-center gap-1.5 text-gray-900 dark:text-white">
                {isCounting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                    <span className="text-gray-400 font-normal">
                      {t('export.calculating', locale === 'en' ? 'Counting...' : 'Menghitung...')}
                    </span>
                  </>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {matchingCount !== null
                      ? t(
                          'export.countReady',
                          locale === 'en'
                            ? '{count} transactions ready to export'
                            : '{count} transaksi siap diekspor'
                        ).replace(
                          '{count}',
                          matchingCount.toLocaleString(locale === 'en' ? 'en-US' : 'id-ID')
                        )
                      : '...'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800">
              <span>{t('export.filename', locale === 'en' ? 'File name:' : 'Nama berkas:')}</span>
              <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[240px]">
                {filenamePreview}
              </span>
            </div>

            {/* Empty count warning */}
            {!isCounting && matchingCount === 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs border border-amber-200 dark:border-amber-800/60 mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {t(
                    'export.noTransactionsMatch',
                    locale === 'en'
                      ? 'No transactions match this filter.'
                      : 'Tidak ada transaksi yang sesuai dengan filter ini.'
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2.5 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDownloading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[44px] cursor-pointer"
          >
            {t('common.cancel', locale === 'en' ? 'Cancel' : 'Batal')}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || isCounting || matchingCount === 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-sm transition min-h-[44px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('export.downloading', locale === 'en' ? 'Generating CSV...' : 'Membuat CSV...')}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{t('export.downloadButton', locale === 'en' ? 'Download CSV' : 'Unduh CSV')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
