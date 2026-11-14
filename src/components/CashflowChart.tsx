'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { CustomSelect } from './ui/CustomSelect';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { getCachedData, mutateCache } from '@/hooks/useSakuKuCache';

export interface CashflowPoint {
  name: string;
  income: number;
  expense: number;
  net: number;
}

export interface CashflowPayload {
  availableYears: number[];
  selectedYear: number;
  months: { month: number; income: number; expense: number; net: number }[];
}

interface CashflowChartProps {
  data?: CashflowPoint[];
  initialCashflow?: CashflowPayload;
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const CashflowChart: React.FC<CashflowChartProps> = ({
  data: initialData,
  initialCashflow,
}) => {
  const { t, locale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(
    initialCashflow?.selectedYear || currentYear
  );
  const [availableYears, setAvailableYears] = useState<number[]>(
    initialCashflow?.availableYears || [currentYear]
  );

  const monthNames = locale === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;

  // Format month list to chart points
  const formatMonthsToPoints = useCallback(
    (months: any[]): CashflowPoint[] => {
      return months.map((m: any, idx: number) => ({
        name: monthNames[idx] || `M${m.month}`,
        income: m.income || 0,
        expense: m.expense || 0,
        net: (m.income || 0) - (m.expense || 0),
      }));
    },
    [monthNames]
  );

  const [chartData, setChartData] = useState<CashflowPoint[]>(() => {
    if (initialCashflow?.months) {
      return formatMonthsToPoints(initialCashflow.months);
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(!initialCashflow);

  // Synchronize when initialCashflow arrives or changes from parent
  useEffect(() => {
    if (initialCashflow) {
      if (initialCashflow.availableYears) {
        setAvailableYears(initialCashflow.availableYears);
      }
      if (initialCashflow.months && initialCashflow.selectedYear === selectedYear) {
        setChartData(formatMonthsToPoints(initialCashflow.months));
        setLoading(false);
      }
      // Seed client-side cache
      mutateCache(`/api/stats/cashflow?year=${initialCashflow.selectedYear}`, initialCashflow);
    }
  }, [initialCashflow, selectedYear, formatMonthsToPoints]);

  const hasLoadedInitial = useRef(Boolean(initialCashflow));

  const fetchCashflow = useCallback(
    async (year: number) => {
      const cacheKey = `/api/stats/cashflow?year=${year}`;
      const cached = getCachedData<CashflowPayload>(cacheKey);

      // 1. Instant Cache Hit (0ms latency, no loading spinner)
      if (cached) {
        if (cached.availableYears) setAvailableYears(cached.availableYears);
        if (cached.months) setChartData(formatMonthsToPoints(cached.months));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(cacheKey);
        if (res.ok) {
          const json = await res.json();
          mutateCache(cacheKey, json);
          if (json.availableYears && Array.isArray(json.availableYears)) {
            setAvailableYears(json.availableYears);
          }
          if (json.months && Array.isArray(json.months)) {
            setChartData(formatMonthsToPoints(json.months));
          }
        }
      } catch (err) {
        console.error('Failed to fetch cashflow data:', err);
      } finally {
        setLoading(false);
      }
    },
    [formatMonthsToPoints]
  );

  useEffect(() => {
    setMounted(true);
    // If we already have initial data from dashboard aggregator, do NOT double-fetch on mount!
    if (hasLoadedInitial.current) {
      hasLoadedInitial.current = false;
      return;
    }
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
        <div className="flex items-center gap-2 self-start sm:self-auto w-24">
          <CustomSelect
            value={selectedYear}
            onChange={(val) => setSelectedYear(Number(val))}
            options={availableYears.map((yr) => ({ value: yr, label: String(yr) }))}
            size="sm"
            disabled={loading}
            aria-label={t('charts.filterYear') || 'Pilih Tahun'}
          />
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
