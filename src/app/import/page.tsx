'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/utils';

export default function ImportPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parsing & Preview state
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [parseError, setParseError] = useState('');

  // Commit state
  const [clearExisting, setClearExisting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitProgress, setCommitProgress] = useState(0);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [commitError, setCommitError] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError('');
    setCommitSuccess(null);
    setCommitError('');
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses berkas Excel.');
      }

      setPreviewData(data);
    } catch (err: any) {
      setParseError(err.message || 'Terjadi kesalahan saat memproses berkas.');
      setPreviewData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || !previewData.transactions.length) return;

    setCommitting(true);
    setCommitProgress(15);
    setCommitError('');

    try {
      setCommitProgress(45);
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: previewData.transactions,
          detectedWallets: previewData.detectedWallets,
          initialBalances: previewData.initialBalances,
          clearExisting,
        }),
      });

      setCommitProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan transaksi ke basis data.');
      }

      setCommitProgress(100);
      setCommitSuccess(data.message || `Berhasil mengimpor transaksi.`);
    } catch (err: any) {
      setCommitError(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-tight">
                  Excel Bulk Import
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Impor ribuan riwayat transaksi sekaligus ke SakuKu
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Success Banner */}
        {commitSuccess && (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-300">
              Impor Berhasil!
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
              {commitSuccess}
            </p>
            <div className="pt-2 flex justify-center space-x-3">
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                Lihat di Dashboard
              </Link>
              <button
                onClick={() => {
                  setFile(null);
                  setPreviewData(null);
                  setCommitSuccess(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
              >
                Impor File Lain
              </button>
            </div>
          </div>
        )}

        {/* Upload Dropzone (if not success) */}
        {!commitSuccess && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative p-8 sm:p-12 rounded-3xl border-2 border-dashed text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                <UploadCloud className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {file ? file.name : 'Pilih atau Tarik Berkas Excel ke Sini'}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, dan{' '}
                  <strong>.csv</strong> (Membaca otomatis lembar <em>Detail Pengeluaran</em>)
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                >
                  Pilih Berkas dari Komputer
                </button>
              </div>

              {parsing && (
                <div className="pt-2 flex items-center justify-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang membersihkan dan memetakan ribuan baris data...</span>
                </div>
              )}

              {parseError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {parseError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Preview & Confirmation */}
        {previewData && !commitSuccess && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Total Valid */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate">Transaksi Valid</span>
                  <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
                </div>
                <div className="mt-2 text-lg sm:text-2xl font-black text-gray-900 dark:text-white truncate">
                  {previewData.summary.validTransactions.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                  Dari total {previewData.summary.totalRows} baris
                </div>
              </div>

              {/* Total Income */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate">Total Pemasukan</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </div>
                <div className="mt-2 text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                  +{formatCurrency(previewData.summary.incomeTotal, locale)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                  {previewData.summary.incomeCount} transaksi masuk
                </div>
              </div>

              {/* Total Expense */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate">Total Pengeluaran</span>
                  <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
                </div>
                <div className="mt-2 text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 truncate">
                  -{formatCurrency(previewData.summary.expenseTotal, locale)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                  {previewData.summary.expenseCount} transaksi keluar
                </div>
              </div>

              {/* Transfers */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-xs sm:shadow-sm">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="truncate">Transfer Dipasangkan</span>
                  <ArrowRightLeft className="w-4 h-4 text-violet-500 flex-shrink-0" />
                </div>
                <div className="mt-2 text-base sm:text-xl font-black text-violet-600 dark:text-violet-400 truncate">
                  {formatCurrency(previewData.summary.transferTotal, locale)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">
                  {previewData.summary.transferCount} mutasi dompet
                </div>
              </div>
            </div>

            {/* Detected Wallets Badge Bar */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Dompet & Rekening Terdeteksi
                </h3>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {previewData.detectedWallets.map((w: any, idx: number) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: w.colorCode }}
                    />
                    <span className="font-bold text-gray-900 dark:text-white">
                      {w.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({w.type})
                    </span>
                    {w.initialBalance > 0 && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Saldo Awal: {formatCurrency(w.initialBalance, locale)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Pratinjau Data Bersih (20 Baris Pertama)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Memverifikasi pasangan transfer, pembersihan typo nama bank, dan kategorisasi
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-400">
                  Total {previewData.totalTransactions} transaksi
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Tanggal</th>
                      <th className="px-3.5 py-2.5">Keterangan</th>
                      <th className="px-3.5 py-2.5">Kategori</th>
                      <th className="px-3.5 py-2.5">Dompet</th>
                      <th className="px-3.5 py-2.5 text-center">Tipe</th>
                      <th className="px-3.5 py-2.5 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {previewData.preview.map((tx: any, idx: number) => {
                      const isIncome = tx.type === 'INCOME';
                      const isExpense = tx.type === 'EXPENSE';
                      const isTransfer = tx.type === 'TRANSFER';

                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40">
                          <td className="px-3.5 py-2 whitespace-nowrap text-gray-500">
                            {tx.dateStr}
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {tx.title}
                            </span>
                            {tx.notes && (
                              <span className="block text-[10px] text-gray-400 italic">
                                {tx.notes}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {tx.category}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 whitespace-nowrap">
                            {isTransfer ? (
                              <div className="flex items-center gap-1 font-medium">
                                <span>{tx.walletName}</span>
                                <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                                <span>{tx.destinationWalletName}</span>
                              </div>
                            ) : (
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {tx.walletName}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 whitespace-nowrap text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isIncome
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isExpense
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 whitespace-nowrap text-right font-bold">
                            {isIncome && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(tx.amount, locale)}
                              </span>
                            )}
                            {isExpense && (
                              <span className="text-rose-600 dark:text-rose-400">
                                -{formatCurrency(tx.amount, locale)}
                              </span>
                            )}
                            {isTransfer && (
                              <span className="text-violet-600 dark:text-violet-400">
                                {formatCurrency(tx.amount, locale)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Commit Actions & Checkbox */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="clearExisting"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="clearExisting" className="text-xs text-gray-600 dark:text-gray-400">
                    Kosongkan seluruh data transaksi lama sebelum menyimpan (Hapus Bersih & Timpa)
                  </label>
                </div>

                {committing && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-blue-600">
                      <span>Menyimpan ke basis data dalam batch...</span>
                      <span>{commitProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                        style={{ width: `${commitProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {commitError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-600 dark:text-rose-400 border border-rose-200">
                    {commitError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewData(null);
                    }}
                    disabled={committing}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[42px] order-2 sm:order-1"
                  >
                    Batal / Ganti Berkas
                  </button>
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={committing}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition disabled:opacity-50 min-h-[42px] order-1 sm:order-2"
                  >
                    {committing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ({previewData.totalTransactions} baris)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Simpan ke Database ({previewData.totalTransactions} Transaksi)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
