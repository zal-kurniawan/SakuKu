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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* 1. Total Net Worth */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm hover:shadow transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
            {t('kpi.totalNetWorth')}
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Wallet className="w-4 h-4 sm:w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <h3 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">
            {formatCurrency(stats.totalNetWorth, locale)}
          </h3>
          <p className="mt-1 text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate font-medium">
            <span>{t('kpi.allWalletsActive') || '● Saldo Aktif Semua Dompet'}</span>
          </p>
        </div>
      </div>

      {/* 2. Monthly Income */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm hover:shadow transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
            {t('kpi.monthlyIncome')}
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <ArrowDownLeft className="w-4 h-4 sm:w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <h3 className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
            +{formatCurrency(stats.monthlyIncome, locale)}
          </h3>
          <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate font-medium">
            <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span className="truncate">{t('kpi.cashflowIn') || 'Arus Kas Masuk'}</span>
          </p>
        </div>
      </div>

      {/* 3. Monthly Expense */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm hover:shadow transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
            {t('kpi.monthlyExpense')}
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex-shrink-0">
            <ArrowUpRight className="w-4 h-4 sm:w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <h3 className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight truncate">
            -{formatCurrency(stats.monthlyExpense, locale)}
          </h3>
          <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate font-medium">
            <TrendingDown className="w-3 h-3 text-rose-500 flex-shrink-0" />
            <span className="truncate">{t('kpi.cashflowOut') || 'Pengeluaran Bulan Ini'}</span>
          </p>
        </div>
      </div>

      {/* 4. Net Savings */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm hover:shadow transition flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
            {t('kpi.netSavings')}
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex-shrink-0">
            <PiggyBank className="w-4 h-4 sm:w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <h3
            className={`text-base sm:text-2xl font-black tracking-tight truncate ${
              stats.netSavings >= 0
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(stats.netSavings, locale)}
          </h3>
          <div className="mt-1 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>{t('kpi.ratio') || 'Rasio:'}</span>
            <span
              className={`font-bold ${
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
