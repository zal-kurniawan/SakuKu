'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldCheck,
  Key,
  WifiOff,
  X,
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

interface WhatsAppLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppLinkerModal: React.FC<WhatsAppLinkerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();
  const toast = useToast();

  const [data, setData] = useState<BotQRResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretKey, setSecretKey] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize secret from query param or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSecret = localStorage.getItem('sakuku_admin_secret');
      if (storedSecret) {
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

  // Polling loop when open
  useEffect(() => {
    if (!isOpen) return;

    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen, fetchBotStatus]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSaveSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakuku_admin_secret', secretKey);
    }
    toast.success(t('botLinker.keySavedToast') || 'Kunci akses admin disimpan');
    setLoading(true);
    fetchBotStatus();
  };

  const handleResetSession = async () => {
    const isConfirmed = await confirm({
      title: t('dialog.disconnectWaTitle') || 'Putuskan Tautan WhatsApp?',
      message:
        t('dialog.disconnectWaDesc') ||
        'Apakah Anda yakin ingin memutuskan tautan WhatsApp? Anda harus scan QR baru untuk menghubungkannya kembali.',
      confirmText: t('botLinker.disconnectButton') || 'Putuskan Tautan',
      cancelText: t('common.cancel') || 'Batal',
      variant: 'danger',
      icon: 'alert',
    });
    if (!isConfirmed) return;

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
        const successMsg = resData.message || 'Sesi WhatsApp berhasil direset.';
        setMessage({ type: 'success', text: successMsg });
        toast.success(successMsg);
        fetchBotStatus();
      } else {
        const errMsg = resData.error || 'Gagal mereset sesi.';
        setMessage({ type: 'error', text: errMsg });
        toast.error(errMsg);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-linker-title"
      >
        {/* Fixed Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="bot-linker-title"
                className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate"
              >
                {t('botLinker.title') || 'SakuKu WhatsApp Bot Linker'}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {t('botLinker.subtitle') || 'Tautkan WhatsApp Anda ke SakuKu Cloud 24/7 tanpa perlu terminal server'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowSecretInput(!showSecretInput)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={t('botLinker.adminKeyTitle') || 'Kunci Akses Admin'}
              aria-label={t('botLinker.adminKeyTitle') || 'Kunci Akses Admin'}
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label={t('botLinker.closeButton') || 'Tutup'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {/* Secret Key Input if requested or required */}
          {showSecretInput && (
            <form
              onSubmit={handleSaveSecret}
              className="p-3.5 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 space-y-2.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-xs sm:text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{t('botLinker.adminKeyTitle') || 'Kunci Akses Admin (ADMIN_SECRET_KEY)'}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                {t('botLinker.adminKeyDesc') ||
                  'Endpoint ini dilindungi. Masukkan kunci yang dikonfigurasi pada environment variable Anda.'}
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="password"
                  placeholder={t('botLinker.adminKeyPlaceholder') || 'Masukkan ADMIN_SECRET_KEY...'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition shrink-0 active:scale-98"
                >
                  {t('botLinker.saveKeyButton') || 'Simpan'}
                </button>
              </div>
            </form>
          )}

          {/* Status Message / Notification */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs sm:text-sm border flex items-center justify-between ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              <span>{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="text-xs underline ml-2 opacity-75 hover:opacity-100 shrink-0"
              >
                {t('botLinker.closeButton') || 'Tutup'}
              </button>
            </div>
          )}

          {/* Main Status View */}
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t('botLinker.checkingStatus') || 'Memeriksa status koneksi WhatsApp Bot...'}
              </p>
            </div>
          ) : data?.connected ? (
            /* 1. CONNECTED STATE */
            <div className="text-center py-2 space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-6 ring-emerald-50 dark:ring-emerald-950/30">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {t('botLinker.statusOnlineTitle') || 'WhatsApp Bot Terhubung & Aktif'}
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('botLinker.statusOnlineDesc') ||
                    'Sesi WhatsApp aktif dan siap menerima perintah pencatatan keuangan 24/7.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-left text-xs sm:text-sm space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('botLinker.serverStatus') || 'Status Server:'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {t('botLinker.onlineStatus') || 'Online & Aktif'}
                  </span>
                </div>
                {data.phone && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('botLinker.connectedNumber') || 'Nomor Terhubung:'}
                    </span>
                    <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                      +{data.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('botLinker.lastUpdate') || 'Pembaruan Terakhir:'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {data.updatedAt
                      ? new Date(data.updatedAt).toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID')
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetSession}
                  disabled={resetting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 disabled:opacity-60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>
                    {resetting
                      ? t('botLinker.disconnecting') || 'Memutuskan...'
                      : t('botLinker.disconnectButton') || 'Putuskan Tautan'}
                  </span>
                </button>
              </div>
            </div>
          ) : data?.status === 'SCANNING_QR' && data?.qrImage ? (
            /* 2. SCANNING QR STATE */
            <div className="text-center py-1 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <QrCode className="w-3.5 h-3.5 animate-bounce" />
                <span>{t('botLinker.waitingQr') || 'Menunggu Scan Perangkat WhatsApp'}</span>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {t('botLinker.statusQrTitle') || 'Pindai Kode QR dengan WhatsApp'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('botLinker.statusQrDesc') ||
                    'Buka WhatsApp di ponsel Anda > Perangkat Tertaut > Tautkan Perangkat.'}
                </p>
              </div>

              {/* QR Image Container: w-52 h-52 sm:w-60 sm:h-60 mx-auto bg-white p-3 rounded-xl */}
              <div className="bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm inline-block mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrImage}
                  alt="SakuKu WhatsApp QR Code"
                  className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                />
              </div>

              {/* Steps guide */}
              <div className="text-left bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                    1
                  </span>
                  <span>{t('botLinker.step1') || 'Buka aplikasi WhatsApp di ponsel Anda.'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                    2
                  </span>
                  <span>
                    {t('botLinker.step2') ||
                      'Masuk ke menu Perangkat Tertaut (Linked Devices) di Pengaturan atau Titik Tiga.'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                    3
                  </span>
                  <span>
                    {t('botLinker.step3') ||
                      'Ketuk Tautkan Perangkat dan arahkan kamera HP ke QR Code di atas.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-1">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                <span>{t('botLinker.autoRefreshNote') || 'Memperbarui otomatis setiap 3 detik...'}</span>
              </div>
            </div>
          ) : (
            /* 3. DISCONNECTED / WORKER OFFLINE STATE */
            <div className="text-center py-2 space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <WifiOff className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {t('botLinker.statusOfflineTitle') || 'Worker Bot Belum Aktif / Offline'}
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  {t('botLinker.statusOfflineDesc') ||
                    'Layanan background worker WhatsApp belum mendeteksi sesi atau sedang offline di cloud provider Anda (Koyeb / Render).'}
                </p>
              </div>

              {/* Troubleshooting Box */}
              <div className="text-left bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 sm:p-4 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>{t('botLinker.troubleshootTitle') || 'Langkah Pemeriksaan:'}</span>
                </p>
                <p>1. {t('botLinker.troubleshootStep1') || 'Pastikan container worker di Koyeb atau Render sudah berjalan ("Healthy").'}</p>
                <p>2. {t('botLinker.troubleshootStep2') || 'Pastikan environment variable DATABASE_URL di worker sama dengan Vercel.'}</p>
                <p>3. {t('botLinker.troubleshootStep3') || 'Jika menguji lokal, jalankan perintah: npm run worker di terminal.'}</p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={fetchBotStatus}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('botLinker.recheckStatus') || 'Cek Ulang Status'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {t('botLinker.closeButton') || 'Tutup'}
          </button>
        </div>
      </div>
    </div>
  );
};
