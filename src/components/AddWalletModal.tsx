'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { X } from 'lucide-react';
import { WalletItem } from './WalletList';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletToEdit?: WalletItem | null;
}

const COLOR_PRESETS = [
  '#00529C', // BCA Blue
  '#0A3B72', // Mandiri Navy
  '#00AED6', // GoPay Cyan
  '#10B981', // Cash Green
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#F43F5E', // Rose
  '#F59E0B', // Amber
];

export const AddWalletModal: React.FC<AddWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  walletToEdit,
}) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [type, setType] = useState<'BANK' | 'EWALLET' | 'CASH'>('BANK');
  const [balance, setBalance] = useState('');
  const [colorCode, setColorCode] = useState('#00529C');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name);
      setType(walletToEdit.type);
      setBalance(String(walletToEdit.balance));
      setColorCode(walletToEdit.colorCode);
    } else {
      setName('');
      setType('BANK');
      setBalance('0');
      setColorCode('#00529C');
    }
    setError('');
  }, [walletToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama dompet wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = walletToEdit
        ? `/api/wallets/${walletToEdit.id}`
        : '/api/wallets';
      const method = walletToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          balance: parseFloat(balance) || 0,
          colorCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan dompet.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {walletToEdit
              ? t('wallets.modalEditTitle')
              : t('wallets.modalAddTitle')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('wallets.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('wallets.namePlaceholder')}
              required
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('wallets.type')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['BANK', 'EWALLET', 'CASH'] as const).map((tVal) => (
                <button
                  key={tVal}
                  type="button"
                  onClick={() => setType(tVal)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition ${
                    type === tVal
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tVal === 'BANK' ? 'Bank' : tVal === 'EWALLET' ? 'E-Wallet' : 'Tunai'}
                </button>
              ))}
            </div>
          </div>

          {/* Balance */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('wallets.initialBalance')} (Rp)
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('wallets.color')}
            </label>
            <div className="flex items-center space-x-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorCode(c)}
                  className={`w-7 h-7 rounded-full transition transform hover:scale-110 ${
                    colorCode === c
                      ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="w-7 h-7 rounded-full border-0 cursor-pointer p-0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {t('wallets.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('wallets.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
