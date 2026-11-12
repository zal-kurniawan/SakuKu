'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { X, Pencil, ChevronDown, ArrowRightLeft } from 'lucide-react';
import { WalletItem } from './WalletList';
import { TransactionItem } from './TransactionTable';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: WalletItem[];
  transaction: TransactionItem | null;
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

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  wallets,
  transaction,
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [walletId, setWalletId] = useState('');
  const [destinationWalletId, setDestinationWalletId] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when transaction changes
  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title || '');
      setAmount(String(transaction.amount || ''));
      setType(transaction.type || 'EXPENSE');
      setWalletId(transaction.walletId || wallets[0]?.id || '');
      setDestinationWalletId(transaction.destinationWalletId || (wallets.find(w => w.id !== transaction.walletId)?.id || ''));
      setCategory(transaction.category || (transaction.type === 'TRANSFER' ? 'Transfer Antar Dompet' : CATEGORIES_EXPENSE[0]));
      setNotes(transaction.notes || '');
      setDate(transaction.date ? new Date(transaction.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setError('');
    }
  }, [transaction, wallets]);

  if (!isOpen || !transaction) return null;

  const currentCategories =
    type === 'EXPENSE'
      ? CATEGORIES_EXPENSE
      : type === 'INCOME'
      ? CATEGORIES_INCOME
      : ['Transfer Antar Dompet'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) {
      setError('Judul dan nominal transaksi wajib diisi.');
      return;
    }

    if (type === 'TRANSFER') {
      if (!destinationWalletId) {
        setError('Dompet tujuan wajib dipilih untuk transaksi transfer.');
        return;
      }
      if (destinationWalletId === walletId) {
        setError(t('transfer.sameWalletError') || 'Dompet asal dan tujuan tidak boleh sama.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          type,
          walletId,
          destinationWalletId: type === 'TRANSFER' ? destinationWalletId : null,
          category: type === 'TRANSFER' ? 'Transfer Antar Dompet' : category,
          notes: notes.trim(),
          date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('transactions.updateFailed', 'Gagal memperbarui transaksi.'));
      }

      toast.success(t('transactions.updateSuccess', 'Transaksi berhasil diperbarui'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || t('transactions.updateFailed', 'Gagal memperbarui transaksi'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {t('transactions.editTransaction') || 'Edit Transaksi'} #{transaction.id}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {t('transactions.editDesc') || 'Perbarui data transaksi yang sudah tercatat'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
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

          <form onSubmit={handleSubmit} id="edit-tx-form" className="space-y-4">
            {/* Type Toggle Buttons (3 Options: Expense, Income, Transfer) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formType') || 'Tipe Transaksi'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('EXPENSE');
                    if (!CATEGORIES_EXPENSE.includes(category)) {
                      setCategory(CATEGORIES_EXPENSE[0]);
                    }
                  }}
                  className={`min-h-[42px] py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    type === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <span>🔴</span> <span className="truncate">{t('transactions.expense') || 'Pengeluaran'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('INCOME');
                    if (!CATEGORIES_INCOME.includes(category)) {
                      setCategory(CATEGORIES_INCOME[0]);
                    }
                  }}
                  className={`min-h-[42px] py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    type === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <span>🟢</span> <span className="truncate">{t('transactions.income') || 'Pemasukan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('TRANSFER');
                    setCategory('Transfer Antar Dompet');
                  }}
                  className={`min-h-[42px] py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    type === 'TRANSFER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> <span className="truncate">{t('transactions.typeTransfer') || 'Transfer'}</span>
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

            {/* Wallet Selection (Source + Destination if Transfer) */}
            <div className={`grid ${type === 'TRANSFER' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              {/* Source Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {type === 'TRANSFER'
                    ? (t('transfer.fromWallet') || 'Dompet Asal')
                    : (t('transactions.formWallet') || 'Pilih Dompet / Rekening')}
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

              {/* Destination Wallet (only for TRANSFER) */}
              {type === 'TRANSFER' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('transfer.toWallet') || 'Dompet Tujuan'}
                  </label>
                  <div className="relative">
                    <select
                      value={destinationWalletId}
                      onChange={(e) => setDestinationWalletId(e.target.value)}
                      className="appearance-none w-full pl-3.5 pr-9 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[44px]"
                    >
                      {wallets
                        .filter((w) => w.id !== walletId)
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ) : (
                /* Category */
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
              )}
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

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition min-h-[42px] flex items-center justify-center cursor-pointer"
          >
            {t('common.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            form="edit-tx-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (t('common.loading') || 'Menyimpan...') : (t('common.save') || 'Simpan Perubahan')}
          </button>
        </div>
      </div>
    </div>
  );
};
