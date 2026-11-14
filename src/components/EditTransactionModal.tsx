'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { X, Pencil, ArrowRightLeft } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { CurrencyInput } from './ui/CurrencyInput';
import { FormFieldError } from './ui/FormFieldError';
import { WalletItem } from './WalletList';
import { TransactionItem } from './TransactionTable';
import { getCategoryLabel } from '@/lib/categories';

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
  const { t, locale } = useTranslation();
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
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    amount?: string;
    walletId?: string;
    destinationWalletId?: string;
    category?: string;
    date?: string;
  }>({});

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
      setFieldErrors({});
    }
  }, [transaction, wallets]);

  useModalEscape({ isOpen, onClose, disabled: loading });

  if (!isOpen || !transaction) return null;

  const currentCategories =
    type === 'EXPENSE'
      ? CATEGORIES_EXPENSE
      : type === 'INCOME'
      ? CATEGORIES_INCOME
      : ['Transfer Antar Dompet'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      title?: string;
      amount?: string;
      walletId?: string;
      destinationWalletId?: string;
      category?: string;
      date?: string;
    } = {};

    if (!title.trim()) {
      errors.title = t(
        'transactions.titleRequired',
        locale === 'en' ? 'Transaction title is required.' : 'Judul transaksi wajib diisi.'
      );
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = t(
        'transactions.amountRequired',
        locale === 'en' ? 'Amount must be greater than Rp 0.' : 'Nominal harus lebih dari Rp 0.'
      );
    }

    if (!walletId) {
      errors.walletId = t(
        'transactions.walletRequired',
        locale === 'en' ? 'Please select a wallet or account.' : 'Silakan pilih dompet atau rekening.'
      );
    }

    if (type === 'TRANSFER') {
      if (!destinationWalletId) {
        errors.destinationWalletId = t(
          'transactions.destWalletRequired',
          locale === 'en'
            ? 'Destination wallet is required for transfer transactions.'
            : 'Dompet tujuan wajib dipilih untuk transaksi transfer.'
        );
      } else if (destinationWalletId === walletId) {
        errors.destinationWalletId = t(
          'transfer.destDifferent',
          locale === 'en'
            ? 'Destination wallet must be different from source wallet.'
            : 'Dompet tujuan harus berbeda dari dompet asal.'
        );
      }
    } else {
      if (!category) {
        errors.category = t(
          'transactions.categoryRequired',
          locale === 'en' ? 'Please select a category.' : 'Silakan pilih kategori.'
        );
      }
    }

    if (!date) {
      errors.date = t(
        'transactions.dateRequired',
        locale === 'en' ? 'Transaction date is required.' : 'Tanggal transaksi wajib diisi.'
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      requestAnimationFrame(() => {
        const firstKey = Object.keys(errors)[0];
        const firstEl = document.getElementById(`edit-tx-${firstKey}-input`);
        firstEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstEl?.focus();
      });
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
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

          <form onSubmit={handleSubmit} id="edit-tx-form" noValidate className="space-y-4">
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
                id="edit-tx-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder={t('transactions.formTitlePlaceholder') || 'Contoh: Makan Siang, Bensin, Gaji'}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-medium focus:outline-none transition-colors min-h-[44px] ${
                  fieldErrors.title
                    ? 'border-rose-500/80 dark:border-rose-500/80 bg-rose-50/40 dark:bg-rose-950/20 ring-2 ring-rose-500/15 focus:border-rose-500 focus:ring-rose-500/25 text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'
                }`}
              />
              <FormFieldError message={fieldErrors.title} />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formAmount') || 'Nominal (Rp)'} *
              </label>
              <CurrencyInput
                id="edit-tx-amount-input"
                value={amount}
                hasError={Boolean(fieldErrors.amount)}
                onChange={(numericVal) => {
                  setAmount(String(numericVal || ''));
                  if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }));
                }}
                placeholder="0"
                size="lg"
              />
              <FormFieldError message={fieldErrors.amount} />
            </div>

            {/* Wallet Selection (Source + Destination if Transfer) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
              {/* Source Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {type === 'TRANSFER'
                    ? (t('transfer.fromWallet') || (locale === 'en' ? 'Source Wallet' : 'Dompet Asal'))
                    : (t('transactions.formWallet') || (locale === 'en' ? 'Select Wallet / Account' : 'Pilih Dompet / Rekening'))} *
                </label>
                <CustomSelect
                  id="edit-tx-walletId-input"
                  value={walletId}
                  hasError={Boolean(fieldErrors.walletId)}
                  onChange={(wId) => {
                    setWalletId(wId);
                    if (fieldErrors.walletId) setFieldErrors((p) => ({ ...p, walletId: undefined }));
                  }}
                  options={wallets.map((w) => ({ value: w.id, label: w.name }))}
                  placeholder={t('transactions.formWallet', locale === 'en' ? 'Select Wallet / Account' : 'Pilih Dompet / Rekening')}
                  size="lg"
                />
                <FormFieldError message={fieldErrors.walletId} />
              </div>

              {/* Destination Wallet (only for TRANSFER) */}
              {type === 'TRANSFER' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('transfer.toWallet') || (locale === 'en' ? 'Destination Wallet' : 'Dompet Tujuan')} *
                  </label>
                  <CustomSelect
                    id="edit-tx-destinationWalletId-input"
                    value={destinationWalletId || ''}
                    hasError={Boolean(fieldErrors.destinationWalletId)}
                    onChange={(val) => {
                      setDestinationWalletId(String(val));
                      if (fieldErrors.destinationWalletId) setFieldErrors((p) => ({ ...p, destinationWalletId: undefined }));
                    }}
                    options={wallets
                      .filter((w) => w.id !== walletId)
                      .map((w) => ({ value: w.id, label: w.name }))}
                    placeholder={t('transactions.selectDestWallet', locale === 'en' ? 'Select Destination Wallet' : 'Pilih Dompet Tujuan')}
                    size="lg"
                  />
                  <FormFieldError message={fieldErrors.destinationWalletId} />
                </div>
              ) : (
                /* Category */
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('transactions.formCategory') || (locale === 'en' ? 'Category' : 'Kategori')} *
                  </label>
                  <CustomSelect
                    id="edit-tx-category-input"
                    value={category}
                    hasError={Boolean(fieldErrors.category)}
                    onChange={(cVal) => {
                      setCategory(cVal);
                      if (fieldErrors.category) setFieldErrors((p) => ({ ...p, category: undefined }));
                    }}
                    options={currentCategories.map((c) => ({ value: c, label: getCategoryLabel(c, locale, t) }))}
                    placeholder={t('transactions.formCategory', locale === 'en' ? 'Select Category' : 'Pilih Kategori')}
                    size="lg"
                  />
                  <FormFieldError message={fieldErrors.category} />
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transactions.formDate') || 'Tanggal'} *
              </label>
              <CustomDatePicker
                id="edit-tx-date-input"
                value={date}
                hasError={Boolean(fieldErrors.date)}
                onChange={(dVal) => {
                  setDate(dVal);
                  if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: undefined }));
                }}
                size="lg"
              />
              <FormFieldError message={fieldErrors.date} />
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
