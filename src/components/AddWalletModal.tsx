'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { X, Wallet } from 'lucide-react';
import { WalletItem } from './WalletList';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletToEdit?: WalletItem | null;
}

const PRESET_COLORS = [
  '#005caa', // BCA Blue
  '#0a2540', // Mandiri Navy
  '#f15a24', // BNI Orange
  '#ff7043', // Jago Yellow/Orange
  '#00aed6', // GoPay Blue
  '#118eea', // DANA Cyan
  '#10b981', // Cash/Emerald
  '#7c3aed', // Superbank Purple
];

const DEFAULT_COLOR = '#005caa';

export const AddWalletModal: React.FC<AddWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  walletToEdit,
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<'BANK' | 'EWALLET' | 'CASH'>('BANK');
  const [balance, setBalance] = useState('');
  const [colorCode, setColorCode] = useState(DEFAULT_COLOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name);
      setType(walletToEdit.type);
      setBalance(String(walletToEdit.balance));
      setColorCode(walletToEdit.colorCode || DEFAULT_COLOR);
    } else {
      setName('');
      setType('BANK');
      setBalance('0');
      setColorCode(DEFAULT_COLOR);
    }
    setError('');
  }, [walletToEdit, isOpen]);

  useModalEscape({ isOpen, onClose, disabled: loading });

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

      const validColor =
        colorCode && colorCode.startsWith('#') && colorCode.length === 7
          ? colorCode
          : DEFAULT_COLOR;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          balance: parseFloat(balance) || 0,
          colorCode: validColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (walletToEdit ? t('wallets.updateFailed', 'Gagal memperbarui dompet.') : t('wallets.addFailed', 'Gagal menyimpan dompet.')));
      }

      if (walletToEdit) {
        toast.success(t('wallets.updateSuccess', 'Dompet berhasil diperbarui'));
      } else {
        toast.success(t('wallets.addSuccess', 'Dompet berhasil ditambahkan'));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || (walletToEdit ? t('wallets.updateFailed', 'Gagal memperbarui dompet') : t('wallets.addFailed', 'Gagal menyimpan dompet')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md max-h-[88dvh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {walletToEdit
                  ? t('wallets.modalEditTitle') || 'Edit Dompet'
                  : t('wallets.addWalletTitle') || t('wallets.modalAddTitle') || 'Tambah Dompet Baru'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {walletToEdit
                  ? t('wallets.modalEditDesc') || 'Ubah rincian dompet'
                  : t('wallets.addWalletDesc') || 'Daftarkan instrumen keuangan baru'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t('common.close') || 'Tutup'}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
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
                {t('wallets.formName') || 'Nama Dompet / Bank'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('wallets.formNamePlaceholder') || 'Contoh: BCA, Mandiri, GoPay, Tunai'}
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            {/* Wallet Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('wallets.formType') || 'Tipe Dompet'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'BANK',
                    label: t('wallets.bank') || t('wallets.typeBank') || 'Bank',
                    icon: '🏦',
                  },
                  {
                    id: 'EWALLET',
                    label: t('wallets.ewallet') || t('wallets.typeEwallet') || 'E-Wallet',
                    icon: '📱',
                  },
                  {
                    id: 'CASH',
                    label: t('wallets.cash') || t('wallets.typeCash') || 'Uang Tunai',
                    icon: '💵',
                  },
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
                {walletToEdit
                  ? t('wallets.balance') || 'Saldo'
                  : t('wallets.formBalance') || 'Saldo Awal (Rp)'}
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

            {/* Color Accent Presets & Custom Hex Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                {t('wallets.formColor') || 'Warna Dompet & Identitas'}
              </label>

              {/* 1. Baris Preset Warna */}
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorCode(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      colorCode.toLowerCase() === c.toLowerCase()
                        ? 'scale-110 border-white ring-2 ring-blue-500 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={c}
                  />
                ))}
              </div>

              {/* 2. Input Hex & Eyedropper / Native Color Picker */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex items-center">
                  <input
                    type="color"
                    value={
                      colorCode.startsWith('#') && colorCode.length === 7
                        ? colorCode
                        : DEFAULT_COLOR
                    }
                    onChange={(e) => setColorCode(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"
                    title={t('wallets.customColor') || 'Pilih palet warna bebas'}
                  />
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">
                    #
                  </span>
                  <input
                    type="text"
                    value={colorCode.replace('#', '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                      setColorCode(`#${val}`);
                    }}
                    onBlur={() => {
                      if (!colorCode || colorCode.length < 7) {
                        setColorCode(DEFAULT_COLOR);
                      }
                    }}
                    placeholder="005caa"
                    maxLength={6}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
                {/* Live Preview Badge */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-sm text-xs"
                  style={{
                    backgroundColor:
                      colorCode.startsWith('#') && colorCode.length === 7
                        ? colorCode
                        : DEFAULT_COLOR,
                  }}
                  title={colorCode}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px] flex items-center justify-center cursor-pointer"
          >
            {t('wallets.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            form="wallet-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? t('common.loading') || 'Memuat...' : t('wallets.save') || 'Simpan Dompet'}
          </button>
        </div>
      </div>
    </div>
  );
};
