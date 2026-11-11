'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Key,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface BotQRResponse {
  success?: boolean;
  status: 'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED';
  connected: boolean;
  qrImage?: string | null;
  rawQr?: string | null;
  phone?: string | null;
  name?: string | null;
  updatedAt?: string;
  error?: string;
}

export default function AdminQRPage() {
  const [data, setData] = useState<BotQRResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretKey, setSecretKey] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize secret from query param or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSecret = urlParams.get('secret') || urlParams.get('key');
      const storedSecret = localStorage.getItem('sakuku_admin_secret');
      if (urlSecret) {
        setSecretKey(urlSecret);
        localStorage.setItem('sakuku_admin_secret', urlSecret);
      } else if (storedSecret) {
        setSecretKey(storedSecret);
      }
    }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    try {
      const query = secretKey ? `?secret=${encodeURIComponent(secretKey)}` : '';
      const res = await fetch(`/api/bot/qr${query}`, {
        headers: secretKey ? { 'x-admin-secret': secretKey } : {},
      });

      if (res.status === 401) {
        setShowSecretInput(true);
        setData(null);
        setLoading(false);
        return;
      }

      const result = await res.json();
      setData(result);
      if (result.success) {
        setShowSecretInput(false);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [secretKey]);

  // Polling loop
  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchBotStatus]);

  const handleSaveSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakuku_admin_secret', secretKey);
    }
    setLoading(true);
    fetchBotStatus();
  };

  const handleResetSession = async () => {
    if (!confirm('Apakah Anda yakin ingin memutuskan tautan WhatsApp? Anda harus scan QR baru untuk menghubungkannya kembali.')) {
      return;
    }

    setResetting(true);
    setMessage(null);
    try {
      const query = secretKey ? `?secret=${encodeURIComponent(secretKey)}` : '';
      const res = await fetch(`/api/bot/qr${query}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secretKey ? { 'x-admin-secret': secretKey } : {}),
        },
        body: JSON.stringify({ action: 'reset' }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: resData.message || 'Sesi WhatsApp berhasil direset.' });
        fetchBotStatus();
      } else {
        setMessage({ type: 'error', text: resData.error || 'Gagal mereset sesi.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard SakuKu
          </Link>
          <button
            onClick={() => setShowSecretInput(!showSecretInput)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            title="Pengaturan Kunci Akses"
          >
            <Key className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/20">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            SakuKu WhatsApp Bot Linker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Tautkan WhatsApp Anda ke SakuKu Cloud 24/7 tanpa perlu terminal server
          </p>
        </div>

        {/* Secret Key Input if required */}
        {showSecretInput && (
          <form
            onSubmit={handleSaveSecret}
            className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20"
          >
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-sm font-semibold mb-2">
              <ShieldCheck className="w-4 h-4" />
              Kunci Akses Admin (ADMIN_SECRET_KEY)
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400/80 mb-3">
              Endpoint ini dilindungi. Masukkan kunci yang dikonfigurasi pada environment variable Anda.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Masukkan ADMIN_SECRET_KEY..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
              >
                Simpan
              </button>
            </div>
          </form>
        )}

        {/* Notification Toast */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm border flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-xs underline ml-2 opacity-75 hover:opacity-100"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Memeriksa status koneksi WhatsApp Bot...
              </p>
            </div>
          ) : data?.connected ? (
            /* CONNECTED STATE */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                WhatsApp Bot Berhasil Terhubung!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                SakuKu Assistant siap mencatat keuangan Anda 24/7.
              </p>

              <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-left">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Status Server:</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online & Aktif
                  </span>
                </div>
                {data.phone && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Nomor Terhubung:</span>
                    <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                      +{data.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Pembaruan Terakhir:</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('id-ID') : '-'}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-emerald-500/20 text-center"
                >
                  Buka Dashboard SakuKu
                </Link>
                <button
                  onClick={handleResetSession}
                  disabled={resetting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-sm font-medium transition"
                >
                  <LogOut className="w-4 h-4" />
                  {resetting ? 'Memutuskan...' : 'Putuskan Tautan'}
                </button>
              </div>
            </div>
          ) : data?.status === 'SCANNING_QR' && data?.qrImage ? (
            /* SCANNING QR STATE */
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 mb-4">
                <QrCode className="w-3.5 h-3.5 animate-bounce" />
                Menunggu Scan Perangkat WhatsApp
              </div>

              <h2 className="text-lg font-bold mb-1">Pindai Kode QR Ini</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Kode QR ini diperbarui otomatis secara real-time dari database
              </p>

              {/* QR Image Container */}
              <div className="bg-white p-4 rounded-2xl border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/5 inline-block mx-auto mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrImage}
                  alt="SakuKu WhatsApp QR Code"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                />
              </div>

              {/* Steps guide */}
              <div className="text-left bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>Buka aplikasi <strong>WhatsApp</strong> di ponsel Anda.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>
                    Masuk ke menu <strong>Perangkat Tertaut (Linked Devices)</strong> di Pengaturan atau Titik Tiga.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>
                    Ketuk <strong>Tautkan Perangkat</strong> dan arahkan kamera HP ke QR Code di atas.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>Memperbarui otomatis setiap 3 detik...</span>
              </div>
            </div>
          ) : (
            /* DISCONNECTED / WORKER OFFLINE STATE */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                <WifiOff className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Worker Bot Belum Aktif / Offline
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                Layanan background worker WhatsApp belum mendeteksi sesi atau sedang offline di cloud provider Anda (Koyeb / Render).
              </p>

              <div className="mt-6 text-left bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Langkah Pemeriksaan:
                </p>
                <p>1. Pastikan container worker di <strong>Koyeb</strong> atau <strong>Render</strong> sudah berjalan (*Healthy*).</p>
                <p>2. Pastikan environment variable <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">DATABASE_URL</code> di worker sama dengan Vercel.</p>
                <p>3. Jika menguji lokal, jalankan perintah: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">npm run worker</code> di terminal.</p>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={fetchBotStatus}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cek Ulang Status
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 dark:text-gray-600 py-4 mt-8">
        SakuKu Financial Cloud Platform • Baileys Multi-Device Zero-File Architecture
      </footer>
    </div>
  );
}
