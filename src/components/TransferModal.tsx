'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { formatCurrency } from '@/lib/utils';
import { X, ArrowRightLeft } from 'lucide-react';
import { CustomSelect } from './ui/CustomSelect';
import { CurrencyInput } from './ui/CurrencyInput';
import { WalletItem } from './WalletList';

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
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wallets.length >= 2) {
      const from = defaultFromWalletId || wallets[0].id;
      setFromWalletId(from);
      const to = wallets.find((w) => w.id !== from)?.id || wallets[1].id;
      setToWalletId(to);
    }
    setAmount('');
    setNotes('');
    setError('');
  }, [wallets, defaultFromWalletId, isOpen]);

  useModalEscape({ isOpen, onClose, disabled: loading });

  if (!isOpen) return null;

  const selectedFromWallet = wallets.find((w) => w.id === fromWalletId);
  const selectedToWallet = wallets.find((w) => w.id === toWalletId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWalletId === toWalletId) {
      setError(t('transfer.sameWalletError') || 'Dompet asal dan tujuan tidak boleh sama');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Nominal transfer harus lebih dari 0.');
      return;
    }

    if (selectedFromWallet && selectedFromWallet.balance < numAmount) {
      setError(t('transfer.insufficientBalance') || 'Saldo dompet asal tidak mencukupi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWalletId,
          toWalletId,
          amount: numAmount,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('transfer.transferFailed', 'Gagal melakukan transfer.'));
      }

      toast.success(t('transfer.transferSuccess', 'Transfer saldo berhasil'));
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

          <form onSubmit={handleSubmit} id="transfer-form" className="space-y-4">
            {/* From & To Wallets (Responsive 2 Cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* From Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transfer.fromWallet') || 'Dompet Asal'}
                </label>
                <CustomSelect
                  value={fromWalletId}
                  onChange={setFromWalletId}
                  options={wallets.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${formatCurrency(w.balance, locale)})`,
                  }))}
                  size="lg"
                />
              </div>

              {/* To Wallet */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('transfer.toWallet') || 'Dompet Tujuan'}
                </label>
                <CustomSelect
                  value={toWalletId}
                  onChange={setToWalletId}
                  options={wallets.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${formatCurrency(w.balance, locale)})`,
                    disabled: w.id === fromWalletId,
                  }))}
                  size="lg"
                />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('transfer.amount') || 'Nominal Transfer (Rp)'} *
              </label>
              <CurrencyInput
                value={amount}
                onChange={(numericVal) => setAmount(String(numericVal || ''))}
                placeholder="0"
                required
                size="lg"
              />
              {selectedFromWallet && (
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {t('transfer.availableBalance') || 'Saldo tersedia'}:{' '}
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {formatCurrency(selectedFromWallet.balance, locale)}
                  </span>
                </p>
              )}
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
