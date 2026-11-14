'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { formatCurrency } from '@/lib/utils';
import { X, ArrowRightLeft } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { CurrencyInput } from './ui/CurrencyInput';
import { FormFieldError } from './ui/FormFieldError';
import { WalletItem } from './WalletList';

const getTodayLocalDate = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallets: WalletItem[];
  defaultFromWalletId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  wallets,
  defaultFromWalletId,
}) => {
  const { t, locale } = useTranslation();
  const toast = useToast();

  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string>(getTodayLocalDate);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    fromWalletId?: string;
    toWalletId?: string;
    amount?: string;
    date?: string;
  }>({});

  useEffect(() => {
    if (wallets.length >= 2) {
      const from = defaultFromWalletId || wallets[0].id;
      setFromWalletId(from);
      const to = wallets.find((w) => w.id !== from)?.id || wallets[1].id;
      setToWalletId(to);
    }
    setAmount('');
    setDate(getTodayLocalDate());
    setNotes('');
    setError('');
    setFieldErrors({});
  }, [wallets, defaultFromWalletId, isOpen]);

  useModalEscape({ isOpen, onClose, disabled: loading });

  if (!isOpen) return null;

  const selectedFromWallet = wallets.find((w) => w.id === fromWalletId);
  const selectedToWallet = wallets.find((w) => w.id === toWalletId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      fromWalletId?: string;
      toWalletId?: string;
      amount?: string;
      date?: string;
    } = {};

    if (!fromWalletId) {
      errors.fromWalletId = t(
        'transfer.sourceRequired',
        locale === 'en' ? 'Please select source wallet.' : 'Silakan pilih dompet asal.'
      );
    }

    if (!toWalletId) {
      errors.toWalletId = t(
        'transfer.destRequired',
        locale === 'en' ? 'Please select destination wallet.' : 'Silakan pilih dompet tujuan.'
      );
    } else if (fromWalletId && toWalletId === fromWalletId) {
      errors.toWalletId = t(
        'transfer.destDifferent',
        locale === 'en'
          ? 'Destination wallet must be different from source wallet.'
          : 'Dompet tujuan harus berbeda dari dompet asal.'
      );
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = t(
        'transfer.amountRequired',
        locale === 'en' ? 'Transfer amount must be greater than Rp 0.' : 'Nominal transfer harus lebih dari Rp 0.'
      );
    } else if (selectedFromWallet && selectedFromWallet.balance < numAmount) {
      errors.amount = t(
        'transfer.insufficientBalance',
        locale === 'en' ? 'Insufficient balance in source wallet.' : 'Saldo dompet asal tidak mencukupi.'
      );
    }

    if (!date) {
      errors.date = t(
        'transfer.dateRequired',
        locale === 'en' ? 'Transfer date is required.' : 'Tanggal transfer wajib diisi.'
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      requestAnimationFrame(() => {
        const firstKey = Object.keys(errors)[0];
        const firstEl = document.getElementById(`transfer-${firstKey}-input`);
        firstEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstEl?.focus();
      });
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWalletId,
          toWalletId,
          amount: numAmount,
          date,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('transfer.transferFailed', 'Gagal melakukan transfer.'));
      }

      toast.success(t('transfer.transferSuccess', 'Transfer saldo berhasil'));
      setDate(getTodayLocalDate());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || t('transfer.transferFailed', 'Gagal melakukan transfer'));
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
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {t('transfer.modalTitle') || 'Transfer Saldo Antar Dompet'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {t('transfer.modalDesc') || 'Pindah saldo antar instrumen dompet'}
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

          <form onSubmit={handleSubmit} id="transfer-form" noValidate className="space-y-4">
            {/* From & To Wallets (Responsive 2 Cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
              {/* From Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transfer.fromWallet') || 'Dompet Asal'}
                </label>
                <CustomSelect
                  id="transfer-fromWalletId-input"
                  value={fromWalletId}
                  onChange={(val) => {
                    setFromWalletId(val);
                    if (fieldErrors.fromWalletId) setFieldErrors((p) => ({ ...p, fromWalletId: undefined }));
                  }}
                  hasError={Boolean(fieldErrors.fromWalletId)}
                  options={wallets.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${formatCurrency(w.balance, locale)})`,
                  }))}
                  placeholder={t('transfer.fromWallet', locale === 'en' ? 'Source Wallet' : 'Dompet Asal')}
                  size="lg"
                />
                <FormFieldError message={fieldErrors.fromWalletId} />
              </div>

              {/* To Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transfer.toWallet') || (locale === 'en' ? 'Destination Wallet' : 'Dompet Tujuan')}
                </label>
                <CustomSelect
                  id="transfer-toWalletId-input"
                  value={toWalletId}
                  onChange={(val) => {
                    setToWalletId(val);
                    if (fieldErrors.toWalletId) setFieldErrors((p) => ({ ...p, toWalletId: undefined }));
                  }}
                  hasError={Boolean(fieldErrors.toWalletId)}
                  options={wallets.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${formatCurrency(w.balance, locale)})`,
                    disabled: w.id === fromWalletId,
                  }))}
                  placeholder={t('transfer.toWallet', locale === 'en' ? 'Destination Wallet' : 'Dompet Tujuan')}
                  size="lg"
                />
                <FormFieldError message={fieldErrors.toWalletId} />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transfer.amount') || 'Nominal Transfer (Rp)'} *
              </label>
              <CurrencyInput
                id="transfer-amount-input"
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
              {selectedFromWallet && (
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {t('transfer.availableBalance') || 'Saldo tersedia'}:{' '}
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {formatCurrency(selectedFromWallet.balance, locale)}
                  </span>
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transfer.date') || t('transactions.formDate') || 'Tanggal'}
              </label>
              <CustomDatePicker
                id="transfer-date-input"
                value={date}
                hasError={Boolean(fieldErrors.date)}
                onChange={(val) => {
                  setDate(val);
                  if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: undefined }));
                }}
                size="lg"
              />
              <FormFieldError message={fieldErrors.date} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transfer.notes') || 'Catatan (Opsional)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('transfer.notesPlaceholder') || 'Contoh: Top up e-wallet, tarik tunai'}
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
            {t('transfer.cancel') || 'Batal'}
          </button>
          <button
            type="submit"
            form="transfer-form"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-sm transition min-h-[42px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? t('common.loading') || 'Memuat...' : t('transfer.confirm') || t('transfer.submit') || 'Konfirmasi Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
};
