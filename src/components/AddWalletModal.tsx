'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { X, Wallet } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-[94vw] sm:max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {walletToEdit ? t('wallets.modalEditTitle') : t('wallets.modalAddTitle')}
              </h3>
              <p className="text-[11px] text-gray-400">
                {walletToEdit ? 'Ubah rincian dompet' : 'Daftarkan instrumen keuangan baru'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="wallet-form" className="space-y-4">
            {/* Wallet Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('wallets.formName')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: BCA, GoPay, Tunai, Jago"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            {/* Wallet Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('wallets.formType')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'BANK', label: t('wallets.typeBank'), icon: '🏦' },
                  { id: 'EWALLET', label: t('wallets.typeEwallet'), icon: '📱' },
                  { id: 'CASH', label: t('wallets.typeCash'), icon: '💵' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as any)}
                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                      type === item.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Initial / Current Balance */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {walletToEdit ? t('wallets.balance') : t('wallets.formBalance')} (Rp)
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            {/* Color Accent Presets */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('wallets.formColor')}
              </label>
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                {COLOR_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColorCode(hex)}
                    className={`w-8 h-8 rounded-full border-2 transition transform active:scale-90 ${
                      colorCode === hex
                        ? 'border-white ring-2 ring-blue-500 scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end space-x-2 flex-shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px]"
          >
            {t('wallets.cancel')}
          </button>
          <button
            type="submit"
            form="wallet-form"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5"
          >
            {loading ? t('common.loading') : t('wallets.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
