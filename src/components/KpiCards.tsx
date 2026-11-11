'use client';

import React from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface KpiCardsProps {
  stats: {
    totalNetWorth: number;
    monthlyIncome: number;
    monthlyExpense: number;
    netSavings: number;
    savingsRate: number;
  };
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats }) => {
  const { t, locale } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Net Worth */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('kpi.totalNetWorth')}
          </span>
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {formatCurrency(stats.totalNetWorth, locale)}
          </h3>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>● Saldo Aktif Semua Dompet</span>
          </p>
        </div>
      </div>

      {/* 2. Monthly Income */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('kpi.monthlyIncome')}
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            +{formatCurrency(stats.monthlyIncome, locale)}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Arus Kas Masuk Bulan Ini</span>
          </p>
        </div>
      </div>

      {/* 3. Monthly Expense */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('kpi.monthlyExpense')}
          </span>
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
            -{formatCurrency(stats.monthlyExpense, locale)}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Pengeluaran Bulan Ini</span>
          </p>
        </div>
      </div>

      {/* 4. Net Savings */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('kpi.netSavings')}
          </span>
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3
            className={`text-2xl font-bold tracking-tight ${
              stats.netSavings >= 0
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(stats.netSavings, locale)}
          </h3>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('kpi.savingsRate')}:</span>
            <span
              className={`font-semibold ${
                stats.savingsRate >= 20
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {stats.savingsRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
