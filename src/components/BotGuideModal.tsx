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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Panduan SakuKu WhatsApp Bot
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gunakan format pipe (|), multi-baris batch, atau slash commands di WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {templates.map((tpl, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border space-y-2 ${
                idx === 0
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-900/60 border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                  {idx === 0 ? (
                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  {tpl.title}
                </span>
                <button
                  onClick={() => copyToClipboard(tpl.example, idx)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition shadow-xs"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Contoh</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-2.5 rounded-lg bg-gray-900 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre">
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

        <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 transition"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
