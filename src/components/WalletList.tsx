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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('wallets.title')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total {wallets.length} dompet aktif terdaftar
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onTransfer()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{t('wallets.transfer')}</span>
          </button>
          <button
            onClick={onAddWallet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('wallets.addWallet')}</span>
          </button>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {wallets.map((wallet) => {
          const share =
            totalNetWorth > 0
              ? Math.max(0, Math.round((wallet.balance / totalNetWorth) * 100))
              : 0;

          return (
            <div
              key={wallet.id}
              className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition group"
            >
              {/* Top Accent Strip with colorCode */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: wallet.colorCode || '#2563EB' }}
              />

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="p-2 rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: wallet.colorCode || '#2563EB' }}
                  >
                    {getIcon(wallet.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      {wallet.name}
                    </h3>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {getTypeLabel(wallet.type)}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => onEditWallet(wallet)}
                    title="Edit"
                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteWallet(wallet.id)}
                    title="Hapus"
                    className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="mt-4">
                <div className="text-xs text-gray-400">{t('wallets.balance')}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(wallet.balance, locale)}
                </div>
              </div>

              {/* Share & Quick Transfer Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Porsi: <span className="font-semibold text-gray-700 dark:text-gray-200">{share}%</span>
                </span>
                <button
                  onClick={() => onTransfer(wallet.id)}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state card if no wallets */}
        {wallets.length === 0 && (
          <div className="col-span-full p-8 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('wallets.empty')}
            </p>
            <button
              onClick={onAddWallet}
              className="mt-3 inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('wallets.addWallet')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
