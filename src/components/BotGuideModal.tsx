'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Smartphone, Layers } from 'lucide-react';

interface BotGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BotGuideModal: React.FC<BotGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const templates = [
    {
      title: '⚡ Multi-Transaksi Sekaligus (Batch Multi-Line)',
      syntax: 'Kirim beberapa baris sekaligus dipisah Enter (newline)',
      example: `insert | makan siang | bca | expense | 35k
insert | beli kopi | gopay | expense | 18k
tf | bca | gopay | 50k | top up`,
      desc: 'Mencatat banyak pengeluaran, pemasukan, dan transfer dalam satu kali kirim pesan WhatsApp secara atomik.',
    },
    {
      title: 'Catat Pengeluaran (Expense)',
      syntax: 'ACTION | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]',
      example: 'catat | makan siang | bca | expense | 35k | Makanan & Minuman',
      desc: 'Mencatat pengeluaran, memotong saldo dompet, dan memvalidasi batas budget bulanan.',
    },
    {
      title: 'Catat Pemasukan (Income)',
      syntax: 'ACTION | TITLE | WALLET | TYPE | AMOUNT | [CATEGORY]',
      example: 'insert | gaji freelance proyek | mandiri | income | 3.5jt | Freelance',
      desc: 'Mencatat pemasukan dan menambah saldo dompet berjalan.',
    },
    {
      title: 'Transfer Antar Dompet / Bank',
      syntax: 'tf | WALLET_DARI | WALLET_TUJUAN | AMOUNT | [NOTES]',
      example: 'tf | bca | gopay | 50k | top up mingguan',
      desc: 'Memindahkan saldo antar dompet secara atomik tanpa selisih.',
    },
    {
      title: 'Cek Total Kekayaan & Saldo',
      syntax: '/saldo atau /dompet',
      example: '/saldo',
      desc: 'Menampilkan rincian saldo tiap bank/e-wallet dan Total Net Worth.',
    },
    {
      title: 'Evaluasi Rekap Harian',
      syntax: '/rekap hari ini',
      example: '/rekap hari ini',
      desc: 'Ringkasan transaksi masuk & keluar hari ini beserta net cashflow.',
    },
    {
      title: 'Evaluasi Cashflow Bulanan',
      syntax: '/rekap bulan ini',
      example: '/rekap bulan ini',
      desc: 'Evaluasi pemasukan, pengeluaran, savings rate %, dan Top 3 kategori belanja terbesar.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-[94vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Panduan SakuKu WhatsApp Bot
              </h3>
              <p className="text-[11px] text-gray-400">
                Gunakan format pipe (|), batch multi-baris, atau slash command di WA
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
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3.5 flex-1">
          {templates.map((tpl, idx) => (
            <div
              key={idx}
              className={`p-3.5 sm:p-4 rounded-xl border space-y-2 ${
                idx === 0
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-900/60 border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  {idx === 0 ? (
                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  ) : (
                    <Terminal className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{tpl.title}</span>
                </span>
                <button
                  onClick={() => copyToClipboard(tpl.example, idx)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-xs flex-shrink-0 min-h-[32px]"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-2.5 rounded-lg bg-gray-900 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre no-scrollbar">
                {tpl.example}
              </pre>

              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Format:</span>{' '}
                <code className="text-gray-600 dark:text-gray-300 font-mono">{tpl.syntax}</code>
                <p className="mt-0.5">{tpl.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end flex-shrink-0 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition min-h-[38px]"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
