'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Smartphone, Layers } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

interface BotGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BotGuideModal: React.FC<BotGuideModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, index: number) => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        success = true;
      } else {
        // Fallback for older browsers / non-HTTPS mobile webviews
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        textArea.remove();
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
      success = false;
    }

    if (success) {
      setCopiedIndex(index);
      toast.success(t('guide.copiedToast') || 'Perintah berhasil disalin!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      toast.error(t('guide.copyFailed') || 'Gagal menyalin perintah');
    }
  };

  const templates = [
    {
      title: t('guide.cmdBatchTitle') || '⚡ Multi-Transaksi Sekaligus (Batch Multi-Line)',
      syntax: t('guide.cmdBatchSyntax') || 'Kirim beberapa baris sekaligus dipisah Enter (newline)',
      example: `insert | makan siang | bca | ex | 35k
insert | beli kopi | gopay | ex | 18k
tf | bca | gopay | 50k | top up`,
      desc: t('guide.cmdBatchDesc') || 'Mencatat banyak pengeluaran, pemasukan, dan transfer dalam satu kali kirim pesan WhatsApp secara atomik.',
    },
    {
      title: t('guide.cmdExpenseTitle') || 'Catat Pengeluaran (Expense)',
      syntax: t('guide.cmdExpenseSyntax') || 'ACTION | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]',
      example: 'catat | makan siang | bca | ex | 35k | Makanan & Minuman',
      desc: t('guide.cmdExpenseDesc') || 'Mencatat pengeluaran (alias TYPE: ex / expense / keluar), memotong saldo dompet, dan memvalidasi batas budget bulanan.',
    },
    {
      title: t('guide.cmdIncomeTitle') || 'Catat Pemasukan (Income)',
      syntax: t('guide.cmdIncomeSyntax') || 'ACTION | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]',
      example: 'insert | bonus proyek | jago | in | 500k | Gaji',
      desc: t('guide.cmdIncomeDesc') || 'Mencatat pemasukan (alias TYPE: in / income / masuk) dan menambah saldo dompet berjalan.',
    },
    {
      title: t('guide.cmdTransferTitle') || 'Transfer Antar Dompet / Bank',
      syntax: t('guide.cmdTransferSyntax') || 'tf | WALLET_DARI | WALLET_TUJUAN | AMOUNT | [NOTES]',
      example: 'tf | bca | gopay | 50k | top up mingguan',
      desc: t('guide.cmdTransferDesc') || 'Memindahkan saldo antar dompet secara atomik tanpa selisih.',
    },
    {
      title: t('guide.cmdDeleteTitle') || 'Hapus Transaksi (Delete)',
      syntax: t('guide.cmdDeleteSyntax') || 'hapus | ID atau delete | ID',
      example: 'hapus | 105',
      desc: t('guide.cmdDeleteDesc') || 'Menghapus data transaksi dan mengembalikan (rollback) saldo dompet secara atomik.',
    },
    {
      title: t('guide.cmdUpdateTitle') || 'Perbarui Transaksi (Update)',
      syntax: t('guide.cmdUpdateSyntax') || 'update | ID | JUDUL | DOMPET | TYPE | NOMINAL | [KATEGORI]',
      example: 'update | 105 | makan siang padang | bca | ex | 45k | Makanan & Minuman',
      desc: t('guide.cmdUpdateDesc') || 'Memperbarui rincian transaksi dan menyesuaikan saldo dompet lama dan baru secara atomik.',
    },
    {
      title: t('guide.cmdSaldoTitle') || 'Cek Total Kekayaan & Saldo',
      syntax: t('guide.cmdSaldoSyntax') || '/saldo atau /dompet',
      example: '/saldo',
      desc: t('guide.cmdSaldoDesc') || 'Menampilkan rincian saldo tiap bank/e-wallet dan Total Net Worth.',
    },
    {
      title: t('guide.cmdRekapTodayTitle') || 'Evaluasi Rekap Harian',
      syntax: t('guide.cmdRekapTodaySyntax') || '/rekap hari ini',
      example: '/rekap hari ini',
      desc: t('guide.cmdRekapTodayDesc') || 'Ringkasan transaksi masuk & keluar hari ini beserta net cashflow.',
    },
    {
      title: t('guide.cmdRekapMonthTitle') || 'Evaluasi Cashflow Bulanan',
      syntax: t('guide.cmdRekapMonthSyntax') || '/rekap bulan ini',
      example: '/rekap bulan ini',
      desc: t('guide.cmdRekapMonthDesc') || 'Evaluasi pemasukan, pengeluaran, savings rate %, dan Top 3 kategori belanja terbesar.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {t('guide.title') || 'Panduan SakuKu WhatsApp Bot'}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {t('guide.subtitle') || 'Gunakan format pipe (|), batch multi-baris, atau slash command di WA'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close') || 'Tutup'}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3.5 flex-1 min-w-0">
          {templates.map((tpl, idx) => (
            <div
              key={idx}
              className={`p-3.5 sm:p-4 rounded-xl border space-y-2 min-w-0 overflow-hidden ${
                idx === 0
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-900/60 border-gray-100 dark:border-gray-800'
              }`}
            >
              {/* Header with Title and Copy Button */}
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {idx === 0 ? (
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <Terminal className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-snug break-words">
                    {tpl.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(tpl.example, idx)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-xs whitespace-nowrap min-h-[32px] cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">{t('guide.copied') || 'Tersalin!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('guide.copy') || 'Salin'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Pre Box */}
              <div className="w-full min-w-0 overflow-hidden rounded-xl">
                <pre className="w-full p-2.5 sm:p-3 rounded-xl bg-gray-900 text-emerald-400 font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre no-scrollbar">
                  {tpl.example}
                </pre>
              </div>

              {/* Format & Description */}
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {t('guide.formatLabel') || 'Format:'}
                </span>{' '}
                <code className="text-gray-600 dark:text-gray-300 font-mono break-all sm:break-normal">
                  {tpl.syntax}
                </code>
                <p className="mt-0.5 leading-relaxed">{tpl.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition min-h-[40px] flex items-center justify-center cursor-pointer"
          >
            {t('guide.close') || 'Tutup Panduan'}
          </button>
        </div>
      </div>
    </div>
  );
};
