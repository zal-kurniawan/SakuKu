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
  ArrowRightLeft,
  Smartphone,
  Globe,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { WalletItem } from './WalletList';

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
  onDelete: (id: string | number) => void;
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
  onDelete,
}) => {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());

    const matchesWallet =
      selectedWallet === 'all' ||
      tx.walletId === selectedWallet ||
      tx.destinationWalletId === selectedWallet;

    const matchesType = selectedType === 'all' || tx.type === selectedType;

    return matchesSearch && matchesWallet && matchesType;
  });

  // Reset to page 1 whenever filters or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedWallet, selectedType, rowsPerPage]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const paginatedItems = filtered.slice(startIndex, endIndex);

  const handleExportCsv = () => {
    window.open('/api/export', '_blank');
  };

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

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          <Link
            href="/import"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition min-h-[38px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Import Excel</span>
          </Link>
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition min-h-[38px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('transactions.exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Responsive Stack on Mobile, Row on Tablet/Desktop */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('transactions.search')}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
          />
        </div>

        {/* Filters Group for Mobile/Tablet */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
          {/* Filter Wallet */}
          <div className="relative inline-block w-full sm:w-[160px] md:w-[180px]">
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="appearance-none w-full pl-3 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate min-h-[42px]"
            >
              <option value="all">{t('transactions.filterWallet')}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>

          {/* Filter Type */}
          <div className="relative inline-block w-full sm:w-[140px] md:w-[160px]">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none w-full pl-3 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate min-h-[42px]"
            >
              <option value="all">{t('transactions.filterType')}</option>
              <option value="INCOME">{t('transactions.income')}</option>
              <option value="EXPENSE">{t('transactions.expense')}</option>
              <option value="TRANSFER">{t('transactions.typeTransfer')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
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
                    <span>{tx.destinationWallet?.name || 'Tujuan'}</span>
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

              {/* Row 3: Date, Source, and Delete Action */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>
                    {new Date(tx.date).toLocaleDateString('id-ID', {
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

                <button
                  onClick={() => handleDelete(tx.id)}
                  title="Hapus"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
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
                    {new Date(tx.date).toLocaleDateString('id-ID', {
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
                          {tx.destinationWallet?.name || 'Tujuan'}
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
                    <button
                      onClick={() => handleDelete(tx.id)}
                      title="Hapus"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition min-h-[34px] min-w-[34px]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
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
                {locale === 'id' ? 'Baris:' : 'Rows:'}
              </span>
              <div className="relative">
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-2.5 pr-7 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-8"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {startIndex + 1}–{endIndex} dari {totalItems}
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
              <span>{locale === 'id' ? 'Sebelumnya' : 'Prev'}</span>
            </button>

            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Hal {validCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1"
            >
              <span>{locale === 'id' ? 'Berikutnya' : 'Next'}</span>
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
              title={locale === 'id' ? 'Halaman Pertama' : 'First Page'}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 flex items-center justify-center"
              title={locale === 'id' ? 'Sebelumnya' : 'Previous Page'}
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
              title={locale === 'id' ? 'Selanjutnya' : 'Next Page'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-600 dark:text-gray-300 flex items-center justify-center"
              title={locale === 'id' ? 'Halaman Terakhir' : 'Last Page'}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
