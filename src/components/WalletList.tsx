'use client';

import React from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  Smartphone,
  Banknote,
  Plus,
  ArrowRightLeft,
  Trash2,
  Edit2,
} from 'lucide-react';

export interface WalletItem {
  id: string;
  name: string;
  type: 'BANK' | 'EWALLET' | 'CASH';
  balance: number;
  colorCode: string;
  createdAt: string;
}

interface WalletListProps {
  wallets: WalletItem[];
  totalNetWorth: number;
  onAddWallet: () => void;
  onEditWallet: (wallet: WalletItem) => void;
  onDeleteWallet: (id: string) => void;
  onTransfer: (fromWalletId?: string) => void;
}

export const WalletList: React.FC<WalletListProps> = ({
  wallets,
  totalNetWorth,
  onAddWallet,
  onEditWallet,
  onDeleteWallet,
  onTransfer,
}) => {
  const { t, locale } = useTranslation();

  const getIcon = (type: string) => {
    switch (type) {
      case 'BANK':
        return <Building2 className="w-4 h-4" />;
      case 'EWALLET':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Banknote className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'BANK':
        return t('wallets.typeBank');
      case 'EWALLET':
        return t('wallets.typeEwallet');
      default:
        return t('wallets.typeCash');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {t('wallets.title')}
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            {t('wallets.subtitle')
              ? t('wallets.subtitle').replace('{count}', String(wallets.length))
              : `Total ${wallets.length} dompet aktif terdaftar`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddWallet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95 min-h-[36px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('wallets.addWallet')}</span>
          </button>
        </div>
      </div>

      {/* Wallet Cards - Mobile Horizontal Swipeable + Desktop/Tablet Grid */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {wallets.map((wallet) => {
          const share =
            totalNetWorth > 0
              ? Math.max(0, Math.round((wallet.balance / totalNetWorth) * 100))
              : 0;

          return (
            <div
              key={wallet.id}
              className="min-w-[260px] max-w-[280px] sm:max-w-none sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm hover:shadow-md transition group flex flex-col justify-between"
            >
              {/* Top Accent Strip with colorCode */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: wallet.colorCode || '#2563EB' }}
              />

              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="p-2 rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: wallet.colorCode || '#2563EB' }}
                    >
                      {getIcon(wallet.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate max-w-[140px] sm:max-w-none">
                        {wallet.name}
                      </h3>
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {getTypeLabel(wallet.type)}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions (Visible on Mobile Touch, Hover on Desktop) */}
                  <div className="flex items-center space-x-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <button
                      onClick={() => onEditWallet(wallet)}
                      title={t('common.edit') || 'Edit Dompet'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteWallet(wallet.id)}
                      title={t('common.delete') || 'Hapus Dompet'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balance */}
                <div className="mt-3 sm:mt-4">
                  <div className="text-[11px] text-gray-400 font-medium">{t('wallets.balance')}</div>
                  <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    {formatCurrency(wallet.balance, locale)}
                  </div>
                </div>
              </div>

              {/* Share & Quick Transfer Footer */}
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                  {t('wallets.portion') || 'Porsi:'} <span className="font-bold text-gray-700 dark:text-gray-200">{share}%</span>
                </span>
                <button
                  onClick={() => onTransfer(wallet.id)}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 text-[11px] py-1 px-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>{t('wallets.transfer') || 'Transfer'}</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state card if no wallets */}
        {wallets.length === 0 && (
          <div className="col-span-full p-6 sm:p-8 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 w-full">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {t('wallets.empty')}
            </p>
            <button
              onClick={onAddWallet}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('wallets.addWallet')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Swipe Hint for Mobile (< 640px) */}
      {wallets.length > 1 && (
        <div className="sm:hidden text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {t('wallets.swipeHint') || '👉 Geser untuk melihat semua dompet 👈'}
          </p>
        </div>
      )}
    </div>
  );
};
