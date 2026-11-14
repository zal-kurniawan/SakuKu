'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { formatCurrency } from '@/lib/utils';
import {
  Download,
  Search,
  Trash2,
  Pencil,
  ArrowRightLeft,
  Smartphone,
  Globe,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Wallet,
  ArrowUpDown,
  Tag,
  Calendar,
} from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { WalletItem } from './WalletList';
import { isExcelImportEnabled } from '@/lib/features';
import { getCachedData, mutateCache } from '@/hooks/useSakuKuCache';

export interface TransactionItem {
  id: number | string;
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  walletId: string;
  destinationWalletId?: string | null;
  notes?: string | null;
  source: 'WHATSAPP' | 'WEB';
  date: string;
  wallet: { name: string; colorCode: string };
  destinationWallet?: { name: string; colorCode: string } | null;
}

interface TransactionTableProps {
  transactions: TransactionItem[];
  wallets: WalletItem[];
  totalCount?: number;
  onDelete: (id: string | number) => void;
  onEdit?: (tx: TransactionItem) => void;
  onRefresh: () => void;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  wallets,
  totalCount: initialTotalCount,
  onDelete,
  onEdit,
}) => {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Server-side loaded data
  const [items, setItems] = useState<TransactionItem[]>(() => transactions.slice(0, 10));
  const [totalCount, setTotalCount] = useState<number>(() =>
    initialTotalCount !== undefined ? initialTotalCount : transactions.length
  );
  const [loading, setLoading] = useState<boolean>(false);

  // Search debounce (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Synchronize when initial transactions or totalCount prop updates from parent
  useEffect(() => {
    if (
      currentPage === 1 &&
      !debouncedSearch &&
      selectedWallet === 'all' &&
      selectedType === 'all' &&
      selectedCategory === 'all' &&
      selectedDateFilter === 'all' &&
      !customDateFrom &&
      !customDateTo
    ) {
      setItems(transactions.slice(0, rowsPerPage));
      if (initialTotalCount !== undefined) {
        setTotalCount(initialTotalCount);
      } else {
        setTotalCount(transactions.length);
      }
    }
  }, [
    transactions,
    initialTotalCount,
    currentPage,
    rowsPerPage,
    debouncedSearch,
    selectedWallet,
    selectedType,
    selectedCategory,
    selectedDateFilter,
    customDateFrom,
    customDateTo,
  ]);

  // Extract unique categories dynamically from both initial transactions and current items
  const uniqueCategories = React.useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.category && tx.category.trim()) set.add(tx.category.trim());
    });
    items.forEach((tx) => {
      if (tx.category && tx.category.trim()) set.add(tx.category.trim());
    });
    return Array.from(set).sort();
  }, [transactions, items]);

  const handleDelete = async (id: string | number) => {
    const isConfirmed = await confirm({
      title: t('dialog.deleteTxTitle', 'Hapus Transaksi?'),
      message: t('dialog.deleteTxDesc', 'Transaksi ini akan dihapus dan saldo dompet akan disesuaikan kembali.'),
      confirmText: t('common.delete', 'Hapus'),
      cancelText: t('common.cancel', 'Batal'),
      variant: 'danger',
      icon: 'trash',
    });
    if (isConfirmed) {
      onDelete(id);
    }
  };

  const isFiltered =
    Boolean(search) ||
    selectedWallet !== 'all' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedDateFilter !== 'all' ||
    Boolean(customDateFrom) ||
    Boolean(customDateTo);

  const handleResetFilter = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedWallet('all');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setCurrentPage(1);
  };

  // Reset to page 1 whenever filters or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedWallet, selectedType, selectedCategory, selectedDateFilter, customDateFrom, customDateTo, rowsPerPage]);

  // Fetch / Query transactions with Server-Side Pagination & Caching
  const isInitialLoad = React.useRef(true);
  useEffect(() => {
    // If it's the very first render and we have initial transactions for page 1 without filters, skip network call!
    if (
      isInitialLoad.current &&
      currentPage === 1 &&
      !debouncedSearch &&
      selectedWallet === 'all' &&
      selectedType === 'all' &&
      selectedCategory === 'all' &&
      selectedDateFilter === 'all' &&
      !customDateFrom &&
      !customDateTo
    ) {
      isInitialLoad.current = false;
      return;
    }
    isInitialLoad.current = false;

    let isCancelled = false;

    const fetchServerTransactions = async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(rowsPerPage));
      if (selectedWallet !== 'all') params.set('walletId', selectedWallet);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      if (selectedDateFilter === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        params.set('dateFrom', todayStr);
        params.set('dateTo', todayStr);
      } else if (selectedDateFilter === 'last7days') {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.set('dateFrom', sevenDaysAgo.toISOString().slice(0, 10));
        params.set('dateTo', now.toISOString().slice(0, 10));
      } else if (selectedDateFilter === 'thisMonth') {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
        params.set('dateFrom', `${yyyy}-${mm}-01`);
        params.set('dateTo', `${yyyy}-${mm}-${lastDay}`);
      } else if (selectedDateFilter === 'lastMonth') {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const yyyy = lastMonth.getFullYear();
        const mm = String(lastMonth.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(yyyy, lastMonth.getMonth() + 1, 0).getDate();
        params.set('dateFrom', `${yyyy}-${mm}-01`);
        params.set('dateTo', `${yyyy}-${mm}-${lastDay}`);
      } else if (selectedDateFilter === 'custom') {
        if (customDateFrom) params.set('dateFrom', customDateFrom);
        if (customDateTo) params.set('dateTo', customDateTo);
      }

      const cacheKey = `/api/transactions?${params.toString()}`;
      const cached = getCachedData<{ transactions: TransactionItem[]; totalCount: number }>(cacheKey);

      if (cached) {
        setItems(cached.transactions || []);
        if (cached.totalCount !== undefined) setTotalCount(cached.totalCount);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(cacheKey);
        if (res.ok && !isCancelled) {
          const json = await res.json();
          mutateCache(cacheKey, json);
          setItems(json.transactions || []);
          if (json.totalCount !== undefined) setTotalCount(json.totalCount);
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchServerTransactions();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    selectedWallet,
    selectedType,
    selectedCategory,
    selectedDateFilter,
    customDateFrom,
    customDateTo,
  ]);

  const totalItems = totalCount;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalItems);
  const paginatedItems = items;

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedWallet !== 'all') params.set('walletId', selectedWallet);
    if (selectedType !== 'all') params.set('type', selectedType);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (search) params.set('search', search);

    if (selectedDateFilter === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      params.set('dateFrom', todayStr);
      params.set('dateTo', todayStr);
    } else if (selectedDateFilter === 'last7days') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      params.set('dateFrom', sevenDaysAgo.toISOString().slice(0, 10));
      params.set('dateTo', now.toISOString().slice(0, 10));
    } else if (selectedDateFilter === 'thisMonth') {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      params.set('dateFrom', `${yyyy}-${mm}-01`);
      params.set('dateTo', `${yyyy}-${mm}-${lastDay}`);
    } else if (selectedDateFilter === 'lastMonth') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const yyyy = lastMonth.getFullYear();
      const mm = String(lastMonth.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(yyyy, lastMonth.getMonth() + 1, 0).getDate();
      params.set('dateFrom', `${yyyy}-${mm}-01`);
      params.set('dateTo', `${yyyy}-${mm}-${lastDay}`);
    } else if (selectedDateFilter === 'custom') {
      if (customDateFrom) params.set('dateFrom', customDateFrom);
      if (customDateTo) params.set('dateTo', customDateTo);
    }

    const qs = params.toString();
    window.open(`/api/export${qs ? `?${qs}` : ''}`, '_blank');
  };

  const walletOptions = [
    { value: 'all', label: t('transactions.filterWallet') || 'Semua Dompet' },
    ...wallets.map((w) => ({ value: w.id, label: w.name })),
  ];

  const typeOptions = [
    { value: 'all', label: t('transactions.filterType') || 'Semua Tipe' },
    { value: 'INCOME', label: t('transactions.income') || 'Pemasukan' },
    { value: 'EXPENSE', label: t('transactions.expense') || 'Pengeluaran' },
    { value: 'TRANSFER', label: t('transactions.typeTransfer') || 'Transfer' },
  ];

  const categoryOptions = [
    { value: 'all', label: t('transactions.filterCategory') || 'Semua Kategori' },
    ...uniqueCategories.map((c) => ({ value: c, label: c })),
  ];

  const dateFilterOptions = [
    { value: 'all', label: t('transactions.filterDate') || 'Semua Tanggal' },
    { value: 'today', label: t('transactions.dateToday') || 'Hari Ini' },
    { value: 'last7days', label: t('transactions.dateLast7Days') || '7 Hari Terakhir' },
    { value: 'thisMonth', label: t('transactions.dateThisMonth') || 'Bulan Ini' },
    { value: 'lastMonth', label: t('transactions.dateLastMonth') || 'Bulan Lalu' },
    { value: 'custom', label: t('transactions.dateCustom') || 'Rentang Kustom...' },
  ];

  const rowsPerPageOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            {t('transactions.title')}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            {t('transactions.subtitle') || 'Daftar transaksi masuk, keluar, dan transfer multi-dompet'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch sm:self-auto">
          {isExcelImportEnabled && (
            <Link
              href="/import"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition min-h-[38px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Import Excel</span>
            </Link>
          )}
          <button
            onClick={handleExportCsv}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 sm:h-9 px-4 text-sm font-medium rounded-xl whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>{t('transactions.exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: 2-Row Responsive Layout + Conditional Custom Date */}
      <div className="space-y-2.5 pt-1">
        {/* Row 1: Full-Width Search Bar + Conditional Reset Filter Button */}
        <div className="flex items-center gap-2.5 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('transactions.search') || 'Cari transaksi...'}
              className="w-full pl-9 pr-3 h-10 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1623] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1623] text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-rose-500 hover:border-rose-500/40 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('transactions.resetFilter') || 'Reset Filter'}</span>
            </button>
          )}
        </div>

        {/* Row 2: 4-Column Grid for Dropdowns (no label truncation) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full">
          {/* 1. Wallet Filter */}
          <CustomSelect
            value={selectedWallet}
            onChange={setSelectedWallet}
            options={walletOptions}
            icon={<Wallet className="w-3.5 h-3.5" />}
            isActive={selectedWallet !== 'all'}
            size="md"
            aria-label={t('transactions.filterWallet') || 'Semua Dompet'}
          />

          {/* 2. Type Filter */}
          <CustomSelect
            value={selectedType}
            onChange={setSelectedType}
            options={typeOptions}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            isActive={selectedType !== 'all'}
            size="md"
            aria-label={t('transactions.filterType') || 'Semua Tipe'}
          />

          {/* 3. Category Filter */}
          <CustomSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            icon={<Tag className="w-3.5 h-3.5" />}
            isActive={selectedCategory !== 'all'}
            size="md"
            aria-label={t('transactions.filterCategory') || 'Semua Kategori'}
          />

          {/* 4. Date Preset Filter */}
          <CustomSelect
            value={selectedDateFilter}
            onChange={setSelectedDateFilter}
            options={dateFilterOptions}
            icon={<Calendar className="w-3.5 h-3.5" />}
            isActive={selectedDateFilter !== 'all'}
            size="md"
            aria-label={t('transactions.filterDate') || 'Semua Tanggal'}
          />
        </div>

        {/* Row 3 (Conditional): Custom Date Range Pickers */}
        {selectedDateFilter === 'custom' && (
          <div className="pt-0.5">
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:max-w-md gap-2 sm:gap-2.5 w-full">
              <CustomDatePicker
                value={customDateFrom}
                onChange={setCustomDateFrom}
                placeholder={t('transactions.dateFrom') || 'Dari Tanggal'}
                maxDate={customDateTo || undefined}
                clearable
                size="md"
              />
              <CustomDatePicker
                value={customDateTo}
                onChange={setCustomDateTo}
                placeholder={t('transactions.dateTo') || 'Sampai Tanggal'}
                minDate={customDateFrom || undefined}
                clearable
                size="md"
              />
            </div>
          </div>
        )}
      </div>

      {/* 1. Mobile Card View (< 640px / sm) */}
      <div className="block sm:hidden space-y-2.5">
        {paginatedItems.map((tx) => {
          const isIncome = tx.type === 'INCOME';
          const isExpense = tx.type === 'EXPENSE';
          const isTransfer = tx.type === 'TRANSFER';

          return (
            <div
              key={`mobile-${tx.id}`}
              className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-2.5"
            >
              {/* Row 1: Title & Amount */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 flex-shrink-0 mt-0.5">
                    #{tx.id}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {tx.title}
                    </h4>
                    {tx.notes && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 italic truncate mt-0.5">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-sm font-black tracking-tight ${
                      isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isExpense
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {isIncome && '+'}
                    {isExpense && '-'}
                    {formatCurrency(tx.amount, locale)}
                  </span>
                </div>
              </div>

              {/* Row 2: Badges (Category + Wallet) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-200/70 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {tx.category}
                </span>

                {isTransfer ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40">
                    <span>{tx.wallet.name}</span>
                    <ArrowRightLeft className="w-2.5 h-2.5 text-blue-500" />
                    <span>{tx.destinationWallet?.name || t('transactions.destinationWallet') || 'Tujuan'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: tx.wallet.colorCode || '#3B82F6' }}
                    />
                    <span>{tx.wallet.name}</span>
                  </span>
                )}
              </div>

              {/* Row 3: Date, Source, and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>
                    {new Date(tx.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium">
                    {tx.source === 'WHATSAPP' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                        <Smartphone className="w-3 h-3" /> WA
                      </span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                        <Globe className="w-3 h-3" /> Web
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(tx)}
                      title={t('common.edit') || 'Edit'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(tx.id)}
                    title={t('common.delete') || 'Hapus'}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {paginatedItems.length === 0 && (
          <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
            {t('transactions.empty')}
          </div>
        )}
      </div>

      {/* 2. Desktop & Tablet Safe Horizontal Scroll Table (>= 640px / sm) */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3">{t('transactions.colId') || 'ID'}</th>
              <th className="px-4 py-3">{t('transactions.colDate')}</th>
              <th className="px-4 py-3">{t('transactions.colTitle')}</th>
              <th className="px-4 py-3">{t('transactions.colCategory')}</th>
              <th className="px-4 py-3">{t('transactions.colWallet')}</th>
              <th className="px-4 py-3 text-right">{t('transactions.colAmount')}</th>
              <th className="px-4 py-3 text-center">{t('transactions.colSource')}</th>
              <th className="px-4 py-3 text-right">{t('transactions.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedItems.map((tx) => {
              const isIncome = tx.type === 'INCOME';
              const isExpense = tx.type === 'EXPENSE';
              const isTransfer = tx.type === 'TRANSFER';

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40 transition"
                >
                  {/* ID */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                      #{tx.id}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {new Date(tx.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Title & Notes */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {tx.title}
                    </div>
                    {tx.notes && (
                      <div className="text-[11px] text-gray-400 italic">
                        {tx.notes}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {tx.category}
                    </span>
                  </td>

                  {/* Wallet */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isTransfer ? (
                      <div className="flex items-center space-x-1 font-medium">
                        <span className="text-gray-700 dark:text-gray-300">
                          {tx.wallet.name}
                        </span>
                        <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {tx.destinationWallet?.name || t('transactions.destinationWallet') || 'Tujuan'}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {tx.wallet.name}
                      </span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 whitespace-nowrap text-right font-bold">
                    {isIncome && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(tx.amount, locale)}
                      </span>
                    )}
                    {isExpense && (
                      <span className="text-rose-600 dark:text-rose-400">
                        -{formatCurrency(tx.amount, locale)}
                      </span>
                    )}
                    {isTransfer && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatCurrency(tx.amount, locale)}
                      </span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {tx.source === 'WHATSAPP' ? (
                      <span
                        title="Via WhatsApp Bot"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      >
                        <Smartphone className="w-3 h-3 text-emerald-500" />
                        <span>WA</span>
                      </span>
                    ) : (
                      <span
                        title="Via Web Dashboard"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      >
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span>Web</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(tx)}
                          title={t('common.edit') || 'Edit'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(tx.id)}
                        title={t('common.delete') || 'Hapus'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  {t('transactions.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {/* Top/Left Section: Rows Per Page & Item Range Counter */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-medium">
                {t('transactions.rows') || (locale === 'id' ? 'Baris:' : 'Rows:')}
              </span>
              <div className="w-[72px]">
                <CustomSelect
                  value={rowsPerPage}
                  onChange={(val) => setRowsPerPage(Number(val))}
                  options={rowsPerPageOptions}
                  size="sm"
                  aria-label={t('transactions.rows')}
                />
              </div>
            </div>

            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {startIndex + 1}–{endIndex} {t('transactions.of') || (locale === 'id' ? 'dari' : 'of')} {totalItems}
            </span>
          </div>

          {/* Bottom/Right Section: Adaptive Page Navigation */}
          {/* A. Mobile Compact View (< 640px / sm) */}
          <div className="flex sm:hidden items-center justify-between w-full pt-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{t('transactions.prevPage') || (locale === 'id' ? 'Sebelumnya' : 'Prev')}</span>
            </button>

            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {t('transactions.pageOf')
                ? t('transactions.pageOf').replace('{page}', String(validCurrentPage)).replace('{total}', String(totalPages))
                : `Hal ${validCurrentPage} / ${totalPages}`}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"
            >
              <span>{t('transactions.nextPage') || (locale === 'id' ? 'Berikutnya' : 'Next')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* B. Tablet & Desktop Full View (>= 640px / sm) */}
          <div className="hidden sm:flex items-center gap-1">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 flex items-center justify-center"
              title={t('transactions.firstPage') || (locale === 'id' ? 'Halaman Pertama' : 'First Page')}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 flex items-center justify-center"
              title={t('transactions.prevPage') || (locale === 'id' ? 'Sebelumnya' : 'Previous Page')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1 px-1">
              {getPageNumbers(validCurrentPage, totalPages).map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setCurrentPage(Number(p))}
                    className={`min-w-[36px] h-9 px-2 rounded-lg font-semibold transition text-xs sm:text-sm flex items-center justify-center ${
                      validCurrentPage === p
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 flex items-center justify-center"
              title={t('transactions.nextPage') || (locale === 'id' ? 'Selanjutnya' : 'Next Page')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 flex items-center justify-center"
              title={t('transactions.lastPage') || (locale === 'id' ? 'Halaman Terakhir' : 'Last Page')}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
