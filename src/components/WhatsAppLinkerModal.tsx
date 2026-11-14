'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { useBotStatus } from '@/context/BotStatusContext';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  RotateCw,
  Loader2,
  LogOut,
  Smartphone,
  ShieldCheck,
  Key,
  WifiOff,
  X,
} from 'lucide-react';

interface BotQRResponse {
  success?: boolean;
  status: 'CONNECTED' | 'SCANNING_QR' | 'DISCONNECTED' | 'RESTARTING';
  connected: boolean;
  qrImage?: string | null;
  rawQr?: string | null;
  phone?: string | null;
  name?: string | null;
  disconnectReason?: 'loggedOut' | 'network' | null;
  hasSession?: boolean;
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
  const { setBotStatus: setGlobalBotStatus } = useBotStatus();

  const [data, setData] = useState<BotQRResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretKey, setSecretKey] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const adminInputRef = useRef<HTMLInputElement>(null);
  const autoPollRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize secret from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSecret = localStorage.getItem('sakuku_admin_secret');
      if (storedSecret) {
        setSecretKey(storedSecret);
      }
    }
  }, []);

  // Cleanup auto poll on unmount
  useEffect(() => {
    return () => {
      if (autoPollRef.current) {
        clearInterval(autoPollRef.current);
      }
    };
  }, []);

  const fetchBotStatus = useCallback(async (silent = false): Promise<BotQRResponse | null> => {
    try {
      const storedSecret =
        secretKey ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('sakuku_admin_secret') || ''
          : '');
      const query = storedSecret ? `?secret=${encodeURIComponent(storedSecret)}` : '';
      const res = await fetch(`/api/bot/qr${query}`, {
        headers: storedSecret ? { 'x-admin-secret': storedSecret } : {},
      });

      if (res.status === 401) {
        setShowSecretInput(true);
        setData(null);
        if (!silent) setLoading(false);
        setGlobalBotStatus('DISCONNECTED');
        return null;
      }

      const result: BotQRResponse = await res.json();
      setData(result);
      if (result.success) {
        setGlobalBotStatus(result.status);
      }
      return result;
    } catch (err: any) {
      console.error('Fetch error:', err);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [secretKey, setGlobalBotStatus]);

  // Polling loop when modal is open and not in manual restart progress
  useEffect(() => {
    if (!isOpen) return;

    fetchBotStatus();
    const interval = setInterval(() => {
      if (!isRestarting) {
        fetchBotStatus(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, fetchBotStatus, isRestarting]);

  // Unified modal escape handler
  useModalEscape({ isOpen, onClose });

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

  // Re-check Status with real visual feedback & status toasts
  const handleRecheckStatus = async () => {
    const currentSecret =
      secretKey ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('sakuku_admin_secret') || ''
        : '');

    if (!currentSecret) {
      setShowSecretInput(true);
      toast.info(
        t('botLinker.enterAdminKeyFirst') || 'Masukkan ADMIN_SECRET_KEY terlebih dahulu'
      );
      setTimeout(() => adminInputRef.current?.focus(), 150);
      return;
    }

    setIsChecking(true);
    try {
      const result = await fetchBotStatus();
      if (!result) {
        setShowSecretInput(true);
        toast.info(
          t('botLinker.enterAdminKeyFirst') || 'Masukkan ADMIN_SECRET_KEY terlebih dahulu'
        );
        setTimeout(() => adminInputRef.current?.focus(), 150);
        return;
      }

      if (result.status === 'CONNECTED') {
        toast.success(t('botLinker.toastOnline') || 'WhatsApp Bot aktif dan terhubung');
      } else if (result.status === 'SCANNING_QR') {
        toast.info(t('botLinker.toastQrReady') || 'Kode QR baru siap dipindai');
      } else {
        toast.info(t('botLinker.toastStillOffline') || 'Status diperbarui: Worker masih offline');
      }
    } catch {
      toast.error(t('botLinker.checkStatusFailed') || (locale === 'id' ? 'Gagal memeriksa status bot' : 'Failed to check bot status'));
    } finally {
      setIsChecking(false);
    }
  };

  // Dynamic Primary Action (Buat Kode QR / Restart Worker) with Database Command Dispatching
  const handleRestartWorker = async () => {
    const currentSecret =
      secretKey ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('sakuku_admin_secret') || ''
        : '');

    if (!currentSecret) {
      setShowSecretInput(true);
      toast.info(
        t('botLinker.enterAdminKeyFirst') || 'Masukkan ADMIN_SECRET_KEY terlebih dahulu'
      );
      setTimeout(() => adminInputRef.current?.focus(), 150);
      return;
    }

    const isNeedQR = data?.disconnectReason === 'loggedOut' || !data?.hasSession;

    setIsRestarting(true);
    if (isNeedQR) {
      toast.info(t('botLinker.toastRequestingQr') || 'Meminta kode QR baru ke worker...');
    } else {
      toast.info(t('botLinker.toastDispatchedRestart') || 'Perintah restart dikirim ke worker Render...');
    }

    try {
      const res = await fetch('/api/bot/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': currentSecret,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || t('botLinker.dispatchRestartFailed') || (locale === 'id' ? 'Gagal mengirim instruksi restart.' : 'Failed to send restart instruction.'));
      }

      setGlobalBotStatus('RESTARTING');

      // Auto-polling every 2s up to 30s
      if (autoPollRef.current) clearInterval(autoPollRef.current);
      let tickCount = 0;

      autoPollRef.current = setInterval(async () => {
        tickCount += 1;
        const freshData = await fetchBotStatus(true);

        if (freshData?.status === 'CONNECTED') {
          if (autoPollRef.current) clearInterval(autoPollRef.current);
          setIsRestarting(false);
          toast.success(t('botLinker.toastOnline') || 'WhatsApp Bot aktif dan terhubung');
        } else if (freshData?.status === 'SCANNING_QR' && freshData?.qrImage) {
          if (autoPollRef.current) clearInterval(autoPollRef.current);
          setIsRestarting(false);
          toast.info(t('botLinker.toastQrReady') || 'Kode QR baru siap dipindai');
        } else if (tickCount >= 15) {
          if (autoPollRef.current) clearInterval(autoPollRef.current);
          setIsRestarting(false);
          toast.info(
            t('botLinker.toastWorkerTimeout') ||
              'Worker belum merespons, periksa status service di dashboard Render'
          );
        }
      }, 2000);
    } catch (err: any) {
      console.error('Restart worker error:', err);
      toast.error(err.message || t('botLinker.restartFailed') || (locale === 'id' ? 'Gagal merestart worker' : 'Failed to restart worker'));
      setIsRestarting(false);
    }
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
        const successMsg = resData.message || t('botLinker.resetSessionSuccess') || (locale === 'id' ? 'Sesi WhatsApp berhasil direset.' : 'WhatsApp session reset successfully.');
        setMessage({ type: 'success', text: successMsg });
        toast.success(successMsg);
        fetchBotStatus();
      } else {
        const errMsg = resData.error || t('botLinker.resetSessionFailed') || (locale === 'id' ? 'Gagal mereset sesi.' : 'Failed to reset session.');
        setMessage({ type: 'error', text: errMsg });
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || t('common.networkError') || (locale === 'id' ? 'Terjadi kesalahan jaringan.' : 'Network error occurred.');
      setMessage({ type: 'error', text: errMsg });
      toast.error(errMsg);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  const isNeedQR = data?.disconnectReason === 'loggedOut' || !data?.hasSession;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-linker-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3
              id="bot-linker-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate"
            >
              {t('botLinker.title') || 'SakuKu WhatsApp Bot Linker'}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowSecretInput(!showSecretInput)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title={t('botLinker.adminKeyTitle') || 'Kunci Akses Admin'}
              aria-label={t('botLinker.adminKeyTitle') || 'Kunci Akses Admin'}
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close') || t('botLinker.closeButton') || 'Tutup'}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 pb-5 sm:pb-6 space-y-4 flex-1 min-w-0">
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
                  ref={adminInputRef}
                  type="password"
                  placeholder={t('botLinker.adminKeyPlaceholder') || 'Masukkan ADMIN_SECRET_KEY...'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition shrink-0 active:scale-98 cursor-pointer"
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
                className="text-xs underline ml-2 opacity-75 hover:opacity-100 shrink-0 cursor-pointer"
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
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 disabled:opacity-60 cursor-pointer"
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

              {/* QR Image Container */}
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
                    'Sesi WhatsApp sedang terputus atau layanan background worker di Render belum aktif.'}
                </p>
              </div>

              {/* Troubleshooting Box */}
              <div className="text-left bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 sm:p-4 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>{t('botLinker.troubleshootTitle') || 'Langkah Pemeriksaan:'}</span>
                </p>
                <p>1. {t('botLinker.troubleshootStep1') || 'Klik tombol "Buat Kode QR" atau "Restart Worker" di bawah untuk memulihkan sesi maupun menautkan ulang perangkat.'}</p>
                <p>2. {t('botLinker.troubleshootStep2') || 'Pastikan service worker di dashboard Render berstatus "Live" dan variabel DATABASE_URL sama dengan Vercel.'}</p>
                <p>3. {t('botLinker.troubleshootStep3') || 'Jika menguji secara lokal, pastikan perintah npm run worker sedang berjalan di terminal.'}</p>
              </div>

              {/* Dynamic Action Buttons: Mobile Vertical, Desktop Horizontal */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full">
                {/* 1. Primary Dynamic Button (Buat Kode QR / Restart Worker) */}
                <button
                  type="button"
                  onClick={handleRestartWorker}
                  disabled={isRestarting || isChecking}
                  className={`w-full sm:flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-98 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    isNeedQR
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                  }`}
                >
                  {isRestarting ? (
                    <>
                      {isNeedQR ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      ) : (
                        <RotateCw className="w-4 h-4 animate-spin shrink-0" />
                      )}
                      <span>
                        {isNeedQR
                          ? t('botLinker.generatingQr') || 'Membuat Kode QR...'
                          : t('botLinker.restartingWorker') || 'Merestart Worker...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {isNeedQR ? (
                        <QrCode className="w-4 h-4 shrink-0" />
                      ) : (
                        <RotateCw className="w-4 h-4 shrink-0" />
                      )}
                      <span>
                        {isNeedQR
                          ? t('botLinker.generateQr') || 'Buat Kode QR'
                          : t('botLinker.restartWorker') || 'Restart Worker'}
                      </span>
                    </>
                  )}
                </button>

                {/* 2. Secondary Re-check Status Button */}
                <button
                  type="button"
                  onClick={handleRecheckStatus}
                  disabled={isRestarting || isChecking}
                  className="w-full sm:flex-1 h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition active:scale-98 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 shrink-0 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>
                    {isChecking
                      ? t('botLinker.checking') || 'Memeriksa...'
                      : t('botLinker.recheckStatus') || 'Cek Ulang Status'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
