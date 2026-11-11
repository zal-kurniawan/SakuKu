'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { X, PlusCircle, ChevronDown } from 'lucide-react';
import { WalletItem } from './WalletList';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: WalletItem[];
}

const CATEGORIES_EXPENSE = [
  'Makanan & Minuman',
  'Transportasi',
  'Tagihan & Utilitas',
  'Belanja',
  'Kesehatan',
  'Hiburan',
  'Donasi & Sosial',
  'Pendidikan',
  'Lainnya',
];

const CATEGORIES_INCOME = [
  'Gaji',
  'Freelance',
  'Bonus/THR',
  'Investasi',
  'Penjualan/Refund',
  'Hadiah',
  'Pemasukan Lainnya',
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  wallets,
}) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [category, setCategory] = useState(CATEGORIES_EXPENSE[0]);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentCategories =
    type === 'EXPENSE' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) {
      setError('Judul dan nominal transaksi wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          type,
          walletId: walletId || wallets[0]?.id,
          category,
          notes: notes.trim(),
          date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan transaksi.');
      }

      onSuccess();
      onClose();
      // Reset
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-[94vw] sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {t('transactions.recordNew') || t('transactions.modalAddTitle') || 'Catat Transaksi Baru'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {t('transactions.recordDesc') || 'Catat pemasukan atau pengeluaran'}
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

          <form onSubmit={handleSubmit} id="add-tx-form" className="space-y-4">
            {/* Type Toggle Buttons */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formType') || 'Tipe Transaksi'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('EXPENSE');
                    setCategory(CATEGORIES_EXPENSE[0]);
                  }}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    type === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <span>🔴</span> {t('transactions.expense') || 'Pengeluaran'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('INCOME');
                    setCategory(CATEGORIES_INCOME[0]);
                  }}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    type === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <span>🟢</span> {t('transactions.income') || 'Pemasukan'}
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formTitle') || 'Judul Transaksi'} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('transactions.formTitlePlaceholder') || 'Contoh: Makan Siang, Bensin, Gaji'}
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formAmount') || 'Nominal (Rp)'} *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            {/* Wallet Selection & Category (Responsive 2 Cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transactions.formWallet') || 'Pilih Dompet / Rekening'}
                </label>
                <div className="relative">
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="appearance-none w-full pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[44px]"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transactions.formCategory') || 'Kategori'}
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="appearance-none w-full pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[44px]"
                  >
                    {currentCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formDate') || 'Tanggal'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formNotes') || 'Catatan Transaksi (Opsional)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('transactions.formNotesPlaceholder') || 'Catatan tambahan...'}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer (Fixed at bottom) */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end space-x-2 flex-shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px]"
          >
            {t('transactions.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            form="add-tx-form"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5"
          >
            {loading ? t('common.loading') || 'Memuat...' : t('transactions.save') || 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    </div>
  );
};
