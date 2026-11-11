'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';

interface CashflowPoint {
  name: string;
  income: number;
  expense: number;
  net: number;
}

interface CashflowChartProps {
  data: CashflowPoint[];
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ data }) => {
  const { t, locale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 sm:h-80 flex items-center justify-center text-xs text-gray-400">
        Memuat grafik...
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg text-xs">
          <p className="font-bold text-gray-900 dark:text-white mb-1.5">{label}</p>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
            🟢 {t('charts.income')}: {formatCurrency(payload[0]?.value || 0, locale)}
          </p>
          <p className="text-rose-600 dark:text-rose-400 font-semibold mt-1">
            🔴 {t('charts.expense')}: {formatCurrency(payload[1]?.value || 0, locale)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
          {t('charts.cashflowTitle')}
        </h3>
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          {t('charts.cashflowSubtitle') || 'Perbandingan tren arus kas 6 bulan terakhir'}
        </p>
      </div>

      <div className="h-64 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}jt` : `${value / 1000}k`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(val) => (val === 'income' ? t('charts.income') : t('charts.expense'))}
            />
            <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
