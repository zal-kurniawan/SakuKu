'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CustomSelect } from './ui/CustomSelect';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { getCachedData, mutateCache } from '@/hooks/useSakuKuCache';

interface WalletDistPoint {
  id?: string;
  name: string;
  value: number;
  color: string;
  type?: string;
}

interface WalletDistributionChartProps {
  data: WalletDistPoint[];
  availableYears?: number[];
}

const FULL_MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const FULL_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WalletDistributionChart: React.FC<WalletDistributionChartProps> = ({
  data: liveData,
  availableYears: initialAvailableYears,
}) => {
  const { t, locale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current' or '1'..'12'
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>(
    initialAvailableYears && initialAvailableYears.length > 0
      ? initialAvailableYears
      : [currentYear]
  );
  const [historicalWallets, setHistoricalWallets] = useState<WalletDistPoint[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fullMonths = locale === 'en' ? FULL_MONTHS_EN : FULL_MONTHS_ID;

  // Synchronize availableYears when received from initial dashboard load
  useEffect(() => {
    if (initialAvailableYears && initialAvailableYears.length > 0) {
      setAvailableYears(initialAvailableYears);
    }
  }, [initialAvailableYears]);

  // Fetch available years & historical distribution when month !== 'current'
  const fetchDistribution = useCallback(async (month: string, year: number) => {
    if (month === 'current') {
      setHistoricalWallets(null);
      // Only fetch if availableYears has not been provided from initial dashboard data
      if (!initialAvailableYears || initialAvailableYears.length === 0) {
        try {
          const res = await fetch('/api/stats/wallet-history');
          if (res.ok) {
            const json = await res.json();
            if (json.availableYears) setAvailableYears(json.availableYears);
          }
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    const cacheKey = `/api/stats/wallet-history?month=${month}&year=${year}`;
    const cached = getCachedData<{ availableYears?: number[]; wallets?: WalletDistPoint[] }>(cacheKey);

    if (cached) {
      if (cached.availableYears) setAvailableYears(cached.availableYears);
      if (cached.wallets) setHistoricalWallets(cached.wallets);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(cacheKey);
      if (res.ok) {
        const json = await res.json();
        mutateCache(cacheKey, json);
        if (json.availableYears) setAvailableYears(json.availableYears);
        if (json.wallets) setHistoricalWallets(json.wallets);
      }
    } catch (err) {
      console.error('Failed to fetch historical wallet distribution:', err);
    } finally {
      setLoading(false);
    }
  }, [initialAvailableYears]);

  useEffect(() => {
    setMounted(true);
    fetchDistribution(selectedMonth, selectedYear);
  }, [fetchDistribution, selectedMonth, selectedYear]);

  if (!mounted) {
    return (
      <div className="h-64 sm:h-80 flex items-center justify-center text-xs text-gray-400">
        {t('charts.loading') || 'Memuat grafik...'}
      </div>
    );
  }

  // Choose source data: historical or current live data
  const currentSource = selectedMonth === 'current' ? liveData : (historicalWallets || []);
  const filteredData = currentSource.filter((d) => d.value > 0);
  const totalValue = filteredData.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
      return (
        <div className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg text-xs">
          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate">{item.name}</span>
          </p>
          <p className="mt-1 font-semibold text-gray-700 dark:text-gray-300">
            {formatCurrency(item.value, locale)} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Subtitle based on period
  const periodLabel =
    selectedMonth === 'current'
      ? (t('charts.currentMonth') || 'Saat Ini')
      : `${fullMonths[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
      {/* Header with Title and Month/Year Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            {t('charts.distributionTitle')}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            {selectedMonth === 'current'
              ? (t('charts.distributionSubtitle') || 'Proporsi saldo tiap instrumen dompet & rekening')
              : `${t('charts.distributionSubtitlePeriod') ? t('charts.distributionSubtitlePeriod').replace('{period}', periodLabel) : `Proporsi aset per akhir ${periodLabel}`}`}
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Month Selector */}
          <div className="w-28 sm:w-32">
            <CustomSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              options={[
                { value: 'current', label: t('charts.currentMonth') || 'Saat Ini' },
                ...fullMonths.map((mName, idx) => ({ value: String(idx + 1), label: mName })),
              ]}
              size="sm"
              disabled={loading}
              aria-label={t('charts.filterMonth') || 'Pilih Bulan'}
            />
          </div>

          {/* Year Selector (Visible when specific month is selected) */}
          {selectedMonth !== 'current' && (
            <div className="w-24 animate-in fade-in duration-150">
              <CustomSelect
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                options={availableYears.map((yr) => ({ value: yr, label: String(yr) }))}
                size="sm"
                disabled={loading}
                aria-label={t('charts.filterYear') || 'Pilih Tahun'}
              />
            </div>
          )}
        </div>
      </div>

      <div className="h-64 sm:h-80 w-full relative flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xs flex items-center justify-center z-10 text-xs text-gray-500 dark:text-gray-400">
            {t('charts.loading') || 'Memuat grafik...'}
          </div>
        )}

        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-400 mb-2">
              <span className="text-xl">💳</span>
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('charts.emptyWalletTitle') || 'Belum ada saldo pada dompet aktif'}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              {t('charts.emptyWalletDesc') || 'Tambahkan saldo pada dompet untuk melihat proporsi aset.'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart key={filteredData.map((d) => `${d.name}-${d.value}`).join(',')}>
              <Pie
                data={filteredData}
                cx="50%"
                cy="46%"
                innerRadius={50}
                outerRadius={82}
                paddingAngle={3}
                dataKey="value"
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}-${index}`}
                    fill={entry.color || '#3B82F6'}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
                wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }}
                formatter={(val) => <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
