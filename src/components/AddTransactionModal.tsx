'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { X, PlusCircle } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { CurrencyInput } from './ui/CurrencyInput';
import { WalletItem } from './WalletList';
import { getCategoryLabel } from '@/lib/categories';

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
  const { t, locale } = useTranslation();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [category, setCategory] = useState(CATEGORIES_EXPENSE[0]);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useModalEscape({ isOpen, onClose, disabled: loading });

  if (!isOpen) return null;

  const currentCategories =
    type === 'EXPENSE' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) {
      setError(
        t(
          'transactions.titleAndAmountRequired',
          locale === 'en'
            ? 'Transaction title and amount are required.'
            : 'Judul dan nominal transaksi wajib diisi.'
        )
      );
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
        throw new Error(data.error || t('transactions.addFailed', 'Gagal menyimpan transaksi.'));
      }

      toast.success(t('transactions.addSuccess', 'Transaksi berhasil dicatat'));
      onSuccess();
      onClose();
      // Reset
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || t('transactions.addFailed', 'Gagal mencatat transaksi'));
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
      <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {t('transactions.recordNew') || t('transactions.modalAddTitle') || 'Catat Transaksi Baru'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {t('transactions.recordDesc') || 'Catat pemasukan atau pengeluaran'}
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
              <CurrencyInput
                value={amount}
                onChange={(numericVal) => setAmount(String(numericVal || ''))}
                placeholder="0"
                required
                size="lg"
              />
            </div>

            {/* Wallet Selection & Category (Responsive 2 Cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transactions.formWallet') || (locale === 'en' ? 'Select Wallet / Account' : 'Pilih Dompet / Rekening')}
                </label>
                <CustomSelect
                  value={walletId}
                  onChange={setWalletId}
                  options={wallets.map((w) => ({ value: w.id, label: w.name }))}
                  placeholder={t('transactions.formWallet', locale === 'en' ? 'Select Wallet / Account' : 'Pilih Dompet / Rekening')}
                  size="lg"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transactions.formCategory') || (locale === 'en' ? 'Category' : 'Kategori')}
                </label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={currentCategories.map((c) => ({ value: c, label: getCategoryLabel(c, locale, t) }))}
                  placeholder={t('transactions.formCategory', locale === 'en' ? 'Select Category' : 'Pilih Kategori')}
                  size="lg"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formDate') || 'Tanggal'}
              </label>
              <CustomDatePicker
                value={date}
                onChange={setDate}
                size="lg"
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

        {/* Modal Footer (Sticky at bottom) */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px] flex items-center justify-center cursor-pointer"
          >
            {t('transactions.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            form="add-tx-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? t('common.loading') || 'Memuat...' : t('transactions.save') || 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    </div>
  );
};
