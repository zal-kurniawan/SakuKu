'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Plus,
  Target,
  ChevronDown,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export interface BudgetItem {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  month: number;
  year: number;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setCategory(COMMON_CATEGORIES[0]);
    setMonthlyLimit('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (b: BudgetItem) => {
    setEditingId(b.id);
    setCategory(b.category);
    setMonthlyLimit(String(b.monthlyLimit));
    setError('');
    setModalOpen(true);
  };

  const handleDeleteBudget = async (id: string, categoryName: string) => {
    const isConfirmed = await confirm({
      title: t('dialog.deleteBudgetTitle'),
      message: `${t('dialog.deleteBudgetDesc')} (${categoryName})`,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      icon: 'trash',
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('dialog.budgetDeleteFailed'));
      toast.success(t('dialog.budgetDeleted'));
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || t('dialog.budgetDeleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      setError(t('budgets.limitError') || 'Batas budget harus lebih dari 0.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingId) {
        // Update existing budget
        const res = await fetch(`/api/budgets/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthlyLimit: parseFloat(monthlyLimit),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal memperbarui target budget.');
        }
      } else {
        // Create or upsert budget
        const res = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            monthlyLimit: parseFloat(monthlyLimit),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal menyimpan target budget.');
        }
      }

      setModalOpen(false);
      setEditingId(null);
      setMonthlyLimit('');
      toast.success(t('common.success'));
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('budgets.title') || 'Target Batas Budget Bulanan'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('budgets.subtitle') || 'Pantau batas pengeluaran per kategori bulan berjalan'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('budgets.addBudget') || 'Atur Budget'}</span>
        </button>
      </div>

      {/* Budget Bars */}
      <div className="space-y-4 pt-1">
        {budgets.map((b) => {
          const isDanger = b.percentage >= 100;
          const isWarning = b.percentage >= 75 && b.percentage < 100;

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

          return (
            <div
              key={b.id}
              className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {b.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${badgeBg}`}
                  >
                    {isDanger ? (
                      <>
                        <AlertOctagon className="w-3 h-3 text-rose-500" />
                        <span>{t('budgets.statusOver') || 'Overbudget (>100%)'}</span>
                      </>
                    ) : isWarning ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>{t('budgets.statusWarning') || 'Perhatian (>75%)'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{t('budgets.statusSafe') || 'Aman'}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {b.percentage}%
                  </span>
                  {/* Action Buttons: Edit (Pencil) & Delete (Trash2) */}
                  <div className="flex items-center space-x-0.5 border-l border-gray-200 dark:border-gray-700 pl-1.5">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      title={t('common.edit') || 'Edit'}
                      className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(b.id, b.category)}
                      title={t('common.delete') || 'Hapus'}
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress bar track */}
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${Math.min(100, b.percentage)}%` }}
                />
              </div>

              {/* Stats detail */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                <span>
                  {t('budgets.spent') || 'Terpakai'}:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {formatCurrency(b.spent, locale)}
                  </strong>
                </span>
                <span>
                  {t('budgets.limit') || 'Batas Maksimal'}:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {formatCurrency(b.monthlyLimit, locale)}
                  </strong>
                </span>
                <span>
                  {t('budgets.remaining') || 'Sisa'}:{' '}
                  <strong
                    className={
                      b.remaining <= 0
                        ? 'text-rose-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {formatCurrency(b.remaining, locale)}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="py-6 text-center text-xs text-gray-400">
            {t('budgets.empty') || 'Belum ada batas budget yang diatur.'}{' '}
            <button
              onClick={handleOpenAdd}
              className="text-blue-600 hover:underline font-medium"
            >
              {t('budgets.setNow') || 'Atur batas budget sekarang'}
            </button>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Budget */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-[94vw] sm:max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {editingId
                      ? t('budgets.editBudget') || 'Edit Target Budget'
                      : t('budgets.addBudget') || 'Atur Budget Bulanan'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {editingId
                      ? t('budgets.editDesc') || 'Ubah nominal batas pengeluaran kategori'
                      : t('budgets.addDesc') || 'Tentukan batas maksimal pengeluaran kategori'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-5 flex-1">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveBudget} id="budget-form" className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('transactions.formCategory') || 'Kategori'}
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={!!editingId}
                      className={`appearance-none w-full pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] ${
                        editingId ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'cursor-pointer'
                      }`}
                    >
                      {COMMON_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {!editingId && (
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('budgets.monthlyLimit') || 'Target Batas Bulanan (Rp)'} *
                  </label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder={t('budgets.limitPlaceholder') || 'Contoh: 1500000'}
                    required
                    min="1"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                </div>
              </form>

              {/* Existing Targets Section inside Modal */}
              {budgets.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('budgets.activeTargets') || 'Daftar Target Aktif'} ({budgets.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {budgets.map((b) => (
                      <div
                        key={`modal-item-${b.id}`}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                          editingId === b.id
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                            : 'bg-gray-50/60 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {b.category}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {formatCurrency(b.monthlyLimit, locale)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(b)}
                            className="px-2 py-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium text-[11px] flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{t('common.edit') || 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(b.id, b.category)}
                            className="px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium text-[11px] flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t('common.delete') || 'Hapus'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end space-x-2 flex-shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px]"
              >
                {t('common.cancel') || 'Batal'}
              </button>
              <button
                type="submit"
                form="budget-form"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5"
              >
                {loading ? t('common.loading') || 'Memuat...' : t('common.save') || 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
