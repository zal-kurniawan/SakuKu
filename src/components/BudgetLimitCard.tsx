'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Plus,
  Target,
  Pencil,
  Trash2,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { CurrencyInput } from './ui/CurrencyInput';
import { FormFieldError } from './ui/FormFieldError';
import { getCategoryLabel } from '@/lib/categories';
import {
  getMonthRange,
  formatDateKey,
  formatDateRangeDisplay,
} from '@/lib/timezone';

export interface BudgetItem {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  periodStatus?: 'UPCOMING' | 'ACTIVE' | 'ENDS_TODAY' | 'ENDED';
  daysLeft?: number;
  month?: number;
  year?: number;
}

interface BudgetLimitCardProps {
  budgets: BudgetItem[];
  onRefresh: () => void;
}

const COMMON_CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Tagihan & Utilitas',
  'Belanja',
  'Kesehatan',
  'Hiburan',
  'Donasi & Sosial',
  'Pendidikan',
  'Lainnya',
];

export const BudgetLimitCard: React.FC<BudgetLimitCardProps> = ({
  budgets,
  onRefresh,
}) => {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();
  const toast = useToast();

  const getInitialDates = () => {
    const current = getMonthRange();
    return {
      start: formatDateKey(current.startOfMonth),
      end: formatDateKey(current.endOfMonth),
    };
  };

  const initialDates = getInitialDates();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    category?: string;
    monthlyLimit?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const handleCloseModal = () => {
    if (loading) return;
    setEditingId(null);
    setCategory(COMMON_CATEGORIES[0]);
    setMonthlyLimit('');
    const fresh = getInitialDates();
    setStartDate(fresh.start);
    setEndDate(fresh.end);
    setError('');
    setFieldErrors({});
    setModalOpen(false);
  };

  useModalEscape({
    isOpen: modalOpen,
    onClose: handleCloseModal,
    disabled: loading,
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setCategory(COMMON_CATEGORIES[0]);
    setMonthlyLimit('');
    const fresh = getInitialDates();
    setStartDate(fresh.start);
    setEndDate(fresh.end);
    setError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (b: BudgetItem) => {
    setEditingId(b.id);
    setCategory(b.category);
    setMonthlyLimit(String(b.monthlyLimit));
    setStartDate(b.startDate || initialDates.start);
    setEndDate(b.endDate || initialDates.end);
    setError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (fieldErrors.startDate) {
      setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
    }
    // Auto-adjust endDate if new startDate is after endDate
    if (endDate && val > endDate) {
      setEndDate(val);
      if (fieldErrors.endDate) {
        setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (fieldErrors.endDate) {
      setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
    }
  };

  const handleDeleteBudget = async (id: string, categoryName: string) => {
    const isConfirmed = await confirm({
      title: t('dialog.deleteBudgetTitle', 'Hapus Target Budget?'),
      message: `${t(
        'dialog.deleteBudgetDesc',
        locale === 'en'
          ? 'Remove the budget limit for this category?'
          : 'Hapus batas anggaran untuk kategori ini?'
      )} (${getCategoryLabel(categoryName, locale, t)})`,
      confirmText: t('common.delete', 'Hapus'),
      cancelText: t('common.cancel', 'Batal'),
      variant: 'danger',
      icon: 'trash',
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('dialog.budgetDeleteFailed', 'Gagal menghapus target budget'));
      }
      toast.success(t('dialog.budgetDeleted', 'Target budget berhasil dihapus'));
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || t('dialog.budgetDeleteFailed', 'Gagal menghapus target budget'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      category?: string;
      monthlyLimit?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    if (!category) {
      errors.category = t(
        'budgets.categoryRequired',
        locale === 'en' ? 'Category is required.' : 'Kategori wajib dipilih.'
      );
    }

    const numLimit = parseFloat(monthlyLimit);
    if (!monthlyLimit || isNaN(numLimit) || numLimit <= 0) {
      errors.monthlyLimit = t(
        'budgets.limitRequired',
        locale === 'en'
          ? 'Budget limit must be greater than Rp 0.'
          : 'Batas budget harus lebih dari Rp 0.'
      );
    }

    if (!startDate) {
      errors.startDate = t(
        'budgets.startDateRequired',
        locale === 'en' ? 'Start date is required.' : 'Tanggal mulai wajib diisi.'
      );
    }

    if (!endDate) {
      errors.endDate = t(
        'budgets.endDateRequired',
        locale === 'en' ? 'End date is required.' : 'Tanggal akhir wajib diisi.'
      );
    } else if (startDate && startDate > endDate) {
      errors.endDate = t(
        'budgets.invalidDateRange',
        locale === 'en'
          ? 'End date cannot be before start date.'
          : 'Tanggal akhir tidak boleh sebelum tanggal mulai.'
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      requestAnimationFrame(() => {
        const firstKey = Object.keys(errors)[0];
        const firstEl = document.getElementById(`budget-${firstKey}-input`);
        firstEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstEl?.focus();
      });
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const payload = {
        category,
        monthlyLimit: numLimit,
        startDate,
        endDate,
      };

      const res = await fetch(editingId ? `/api/budgets/${editingId}` : '/api/budgets', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (editingId
              ? t('budgets.updateFailed', 'Gagal memperbarui target budget.')
              : t('budgets.addFailed', 'Gagal menyimpan target budget.'))
        );
      }

      const wasEditing = !!editingId;
      handleCloseModal();

      if (wasEditing) {
        toast.success(t('budgets.updateSuccess', 'Target budget berhasil diperbarui'));
      } else {
        toast.success(t('budgets.addSuccess', 'Target budget berhasil disimpan'));
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message);
      toast.error(
        err.message ||
          (editingId
            ? t('budgets.updateFailed', 'Gagal memperbarui target budget')
            : t('budgets.addFailed', 'Gagal menyimpan target budget'))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3.5 sm:gap-4">
        {/* Left Side: Icon + Title + Subtitle */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug truncate">
              {t('budgets.title', 'Target Batas Budget')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t(
                'budgets.subtitle',
                locale === 'en'
                  ? 'Monitor spending limits per category by period'
                  : 'Pantau batas pengeluaran per kategori sesuai periode'
              )}
            </p>
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('budgets.addBudget', locale === 'en' ? 'Set Budget' : 'Atur Budget')}</span>
        </button>
      </div>

      {/* Visual Separator & Budget List Container */}
      <div className="mt-4 pt-4 sm:mt-5 sm:pt-5 border-t border-gray-100 dark:border-gray-800/80">
        {/* Budget Item List */}
        <div className="space-y-3.5">
          {budgets.map((b) => {
            const isDanger = b.percentage >= 100;
            const isWarning = b.percentage >= 80 && b.percentage < 100;

            const barColor = isDanger
              ? 'bg-rose-500'
              : isWarning
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            const badgeBg = isDanger
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800'
              : isWarning
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';

            const periodLabel = formatDateRangeDisplay(b.startDate, b.endDate, locale);

            // Time period indicator badge styling
            let periodStatusBadge = null;
            if (b.periodStatus === 'ACTIVE') {
              periodStatusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>
                    {t(
                      'budgets.daysLeft',
                      locale === 'en' ? `${b.daysLeft || 0} days left` : `Sisa ${b.daysLeft || 0} hari`
                    ).replace('{days}', String(b.daysLeft || 0))}
                  </span>
                </span>
              );
            } else if (b.periodStatus === 'ENDS_TODAY') {
              periodStatusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>{t('budgets.endsToday', locale === 'en' ? 'Ends today' : 'Hari terakhir')}</span>
                </span>
              );
            } else if (b.periodStatus === 'UPCOMING') {
              periodStatusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>{t('budgets.upcoming', locale === 'en' ? 'Upcoming' : 'Akan datang')}</span>
                </span>
              );
            } else if (b.periodStatus === 'ENDED') {
              periodStatusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>{t('budgets.ended', locale === 'en' ? 'Period ended' : 'Periode berakhir')}</span>
                </span>
              );
            }

            return (
              <div
                key={b.id}
                className="p-3.5 sm:p-4 rounded-xl bg-gray-50/70 dark:bg-[#0f1624]/80 border border-gray-200/70 dark:border-gray-800/80 space-y-3 transition-colors"
              >
                {/* Tingkat 1 — Nama Kategori & Tombol Aksi */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                    {getCategoryLabel(b.category, locale, t)}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      title={t('common.edit', locale === 'en' ? 'Edit' : 'Edit')}
                      aria-label={`${t('common.edit', 'Edit')} ${b.category}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-95 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(b.id, b.category)}
                      title={t('common.delete', locale === 'en' ? 'Delete' : 'Hapus')}
                      aria-label={`${t('common.delete', 'Hapus')} ${b.category}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tingkat 2 — Badge Periode Tanggal, Sisa Hari, & Status Pemakaian */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-200/70 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>{periodLabel}</span>
                  </span>

                  {periodStatusBadge}

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeBg}`}
                  >
                    {isDanger ? (
                      <>
                        <AlertOctagon className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{t('budgets.statusOver', 'Overbudget (>100%)')}</span>
                      </>
                    ) : isWarning ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{t('budgets.statusWarning', 'Perhatian (>80%)')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{t('budgets.statusSafe', 'Aman')}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Tingkat 3 — Nominal Terpakai vs Batas, Persentase, Progress Bar, & Sisa */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <div className="text-gray-600 dark:text-gray-300 truncate">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(b.spent, locale)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1">/</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatCurrency(b.monthlyLimit, locale)}
                      </span>
                    </div>
                    <div className="font-semibold text-xs tabular-nums shrink-0 text-gray-700 dark:text-gray-300">
                      {b.percentage}%
                    </div>
                  </div>

                  {/* Progress bar track */}
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  {/* Remaining balance */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                    <span>{t('budgets.remaining', locale === 'en' ? 'Remaining' : 'Sisa')}:</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        b.remaining <= 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(b.remaining, locale)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {budgets.length === 0 && (
            <div className="py-6 sm:py-8 px-3 text-center flex flex-col items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <p>
                {t(
                  'budgets.empty',
                  locale === 'en'
                    ? 'No budget targets configured.'
                    : 'Belum ada batas budget yang diatur.'
                )}
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {t(
                    'budgets.setNow',
                    locale === 'en'
                      ? 'Set a budget limit now'
                      : 'Atur batas budget sekarang'
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add / Edit Budget */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) handleCloseModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {editingId
                      ? t('budgets.editBudget', locale === 'en' ? 'Edit Budget Target' : 'Edit Target Budget')
                      : t('budgets.addBudget', locale === 'en' ? 'Set Budget Target' : 'Atur Target Budget')}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate">
                    {editingId
                      ? t('budgets.editDesc', locale === 'en' ? 'Modify category spending limit or period' : 'Ubah batas atau periode pengeluaran kategori')
                      : t('budgets.addDesc', locale === 'en' ? 'Define spending limit for category by period' : 'Tentukan batas pengeluaran kategori berdasarkan periode')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={loading}
                aria-label={t('common.close') || 'Tutup'}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveBudget} id="budget-form" noValidate className="space-y-4">
                {/* Field 1: Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('transactions.formCategory') || (locale === 'en' ? 'Category' : 'Kategori')} *
                  </label>
                  <CustomSelect
                    id="budget-category-input"
                    value={category}
                    onChange={(val) => {
                      setCategory(val);
                      if (fieldErrors.category) {
                        setFieldErrors((p) => ({ ...p, category: undefined }));
                      }
                    }}
                    hasError={Boolean(fieldErrors.category)}
                    options={COMMON_CATEGORIES.map((c) => ({
                      value: c,
                      label: getCategoryLabel(c, locale, t),
                    }))}
                    placeholder={t(
                      'transactions.formCategory',
                      locale === 'en' ? 'Select Category' : 'Pilih Kategori'
                    )}
                    disabled={!!editingId}
                    usePortal={true}
                    size="lg"
                  />
                  <FormFieldError message={fieldErrors.category} />
                </div>

                {/* Field 2: Limit (Nominal Rp) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('budgets.monthlyLimit') || (locale === 'en' ? 'Target Limit (Rp)' : 'Target Batas Nominal (Rp)')} *
                  </label>
                  <CurrencyInput
                    id="budget-monthlyLimit-input"
                    value={monthlyLimit}
                    hasError={Boolean(fieldErrors.monthlyLimit)}
                    onChange={(numericVal) => {
                      setMonthlyLimit(String(numericVal || ''));
                      if (fieldErrors.monthlyLimit) {
                        setFieldErrors((p) => ({ ...p, monthlyLimit: undefined }));
                      }
                    }}
                    placeholder="0"
                    size="lg"
                  />
                  <FormFieldError message={fieldErrors.monthlyLimit} />
                </div>

                {/* Field 3: Date Range (Dari Tanggal & Sampai Tanggal) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('budgets.startDate') || (locale === 'en' ? 'Start Date' : 'Dari Tanggal')} *
                    </label>
                    <CustomDatePicker
                      id="budget-startDate-input"
                      value={startDate}
                      onChange={handleStartDateChange}
                      hasError={Boolean(fieldErrors.startDate)}
                      placeholder={locale === 'en' ? 'Select Start Date' : 'Pilih Tanggal Mulai'}
                      usePortal={true}
                      size="lg"
                    />
                    <FormFieldError message={fieldErrors.startDate} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('budgets.endDate') || (locale === 'en' ? 'End Date' : 'Sampai Tanggal')} *
                    </label>
                    <CustomDatePicker
                      id="budget-endDate-input"
                      value={endDate}
                      onChange={handleEndDateChange}
                      minDate={startDate}
                      hasError={Boolean(fieldErrors.endDate)}
                      placeholder={locale === 'en' ? 'Select End Date' : 'Pilih Tanggal Selesai'}
                      usePortal={true}
                      size="lg"
                    />
                    <FormFieldError message={fieldErrors.endDate} />
                  </div>
                </div>
              </form>

              {/* Existing Targets Section inside Modal */}
              {budgets.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('budgets.activeTargets', locale === 'en' ? 'Active Targets List' : 'Daftar Target Aktif')} ({budgets.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 sakuku-scrollbar">
                    {budgets.map((b) => (
                      <div
                        key={`modal-item-${b.id}`}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                          editingId === b.id
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                            : 'bg-gray-50/60 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {getCategoryLabel(b.category, locale, t)}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <span>{formatCurrency(b.monthlyLimit, locale)}</span>
                            <span>•</span>
                            <span>{formatDateRangeDisplay(b.startDate, b.endDate, locale)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(b)}
                            className="px-2 py-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{t('common.edit', 'Edit')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(b.id, b.category)}
                            className="px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t('common.delete', locale === 'en' ? 'Delete' : 'Hapus')}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 bg-gray-50/60 dark:bg-gray-900/40">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px] cursor-pointer"
              >
                {t('common.cancel', locale === 'en' ? 'Cancel' : 'Batal')}
              </button>
              <button
                type="submit"
                form="budget-form"
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? t('common.loading', locale === 'en' ? 'Loading...' : 'Memuat...')
                  : t('common.save', locale === 'en' ? 'Save' : 'Simpan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
