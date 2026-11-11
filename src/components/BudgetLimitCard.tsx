'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, AlertOctagon, CheckCircle2, Plus, Target, ChevronDown } from 'lucide-react';

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
  'Lainnya',
];

export const BudgetLimitCard: React.FC<BudgetLimitCardProps> = ({
  budgets,
  onRefresh,
}) => {
  const { t, locale } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      setError('Batas budget harus lebih dari 0.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          monthlyLimit: parseFloat(monthlyLimit),
        }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan target budget.');

      setModalOpen(false);
      setMonthlyLimit('');
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
              {t('budgets.title')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pantau batas pengeluaran per kategori bulan berjalan
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t('budgets.addBudget')}</span>
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
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {b.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${badgeBg}`}
                  >
                    {isDanger ? (
                      <>
                        <AlertOctagon className="w-3 h-3 text-rose-500" />
                        <span>{t('budgets.statusOver')}</span>
                      </>
                    ) : isWarning ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>{t('budgets.statusWarning')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{t('budgets.statusSafe')}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="font-semibold text-gray-600 dark:text-gray-300">
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

              {/* Stats detail */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                <span>
                  {t('budgets.spent')}:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {formatCurrency(b.spent, locale)}
                  </strong>
                </span>
                <span>
                  {t('budgets.limit')}:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {formatCurrency(b.monthlyLimit, locale)}
                  </strong>
                </span>
                <span>
                  {t('budgets.remaining')}:{' '}
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
            {t('budgets.empty')}{' '}
            <button
              onClick={() => setModalOpen(true)}
              className="text-blue-600 hover:underline font-medium"
            >
              Atur batas budget sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal Add Budget */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-[94vw] sm:max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-3">
              {t('budgets.addBudget')}
            </h3>

            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Kategori
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="appearance-none w-full pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[44px]"
                  >
                    {COMMON_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Target Batas Bulanan (Rp)
                </label>
                <input
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="Contoh: 1500000"
                  required
                  min="1"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[42px]"
                >
                  {t('wallets.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white min-h-[42px]"
                >
                  {loading ? t('common.loading') : t('wallets.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
