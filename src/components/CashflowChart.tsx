'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { ChevronDown, Calendar } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';

interface CashflowPoint {
  name: string;
  income: number;
  expense: number;
  net: number;
}

interface CashflowChartProps {
  data?: CashflowPoint[];
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const CashflowChart: React.FC<CashflowChartProps> = ({ data: initialData }) => {
  const { t, locale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [chartData, setChartData] = useState<CashflowPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const monthNames = locale === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;

  const fetchCashflow = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats/cashflow?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.availableYears && Array.isArray(json.availableYears)) {
          setAvailableYears(json.availableYears);
        }
        if (json.months && Array.isArray(json.months)) {
          const formatted = json.months.map((m: any, idx: number) => ({
            name: monthNames[idx] || `M${m.month}`,
            income: m.income || 0,
            expense: m.expense || 0,
            net: (m.income || 0) - (m.expense || 0),
          }));
          setChartData(formatted);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cashflow data:', err);
    } finally {
      setLoading(false);
    }
  }, [monthNames]);

  useEffect(() => {
    setMounted(true);
    fetchCashflow(selectedYear);
  }, [fetchCashflow, selectedYear]);

  if (!mounted) {
    return (
      <div className="h-64 sm:h-80 flex items-center justify-center text-xs text-gray-400">
        {t('charts.loading') || 'Memuat grafik...'}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg text-xs">
          <p className="font-bold text-gray-900 dark:text-white mb-1.5">
            {label} {selectedYear}
          </p>
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
      {/* Header with Title and Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            {t('charts.cashflowTitle')}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            {t('charts.cashflowSubtitleYear')
              ? t('charts.cashflowSubtitleYear').replace('{year}', String(selectedYear))
              : locale === 'en'
              ? `12-month cash flow comparison for ${selectedYear}`
              : `Perbandingan tren arus kas 12 bulan tahun ${selectedYear}`}
          </p>
        </div>

        {/* Year Dropdown Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label={t('charts.filterYear') || 'Pilih Tahun'}
              className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[36px]"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-80 w-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xs flex items-center justify-center z-10 text-xs text-gray-500 dark:text-gray-400">
            {t('charts.loading') || 'Memuat grafik...'}
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
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
            <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
