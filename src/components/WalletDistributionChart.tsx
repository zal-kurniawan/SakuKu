'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';

interface WalletDistPoint {
  name: string;
  value: number;
  color: string;
  type: string;
}

interface WalletDistributionChartProps {
  data: WalletDistPoint[];
}

export const WalletDistributionChart: React.FC<WalletDistributionChartProps> = ({
  data,
}) => {
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

  const filteredData = data.filter((d) => d.value > 0);
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

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
          {t('charts.distributionTitle')}
        </h3>
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          {t('charts.distributionSubtitle') || 'Proporsi saldo tiap instrumen dompet & rekening'}
        </p>
      </div>

      <div className="h-64 sm:h-80 w-full flex items-center justify-center">
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-400 mb-2">
              <span className="text-xl">💳</span>
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Belum ada saldo pada dompet aktif
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Tambahkan saldo pada dompet untuk melihat proporsi aset.
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
