'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  Send,
  RotateCcw,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  Smartphone,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface ChannelStatus {
  waAvailable: boolean;
  totpConfigured: boolean;
}

export default function LoginPage() {
  const router = useRouter();

  // Standalone Locale & Theme
  const [locale, setLocale] = useState<'id' | 'en'>('id');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  // Auth Mode: 'WA_OTP' | 'TOTP_RECOVERY'
  const [authMode, setAuthMode] = useState<'WA_OTP' | 'TOTP_RECOVERY'>('WA_OTP');
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);

  // WA OTP Step: 1 = Request, 2 = Verify
  const [otpStep, setOtpStep] = useState<1 | 2>(1);

  // 6 Digits Input State
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timers & States
  const [timerSeconds, setTimerSeconds] = useState<number>(180); // 3 minutes validity
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0); // 60s resend cooldown
  const [lockedSeconds, setLockedSeconds] = useState<number>(0); // 15-minute lockout

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Initialize Theme and Locale from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const savedLang = localStorage.getItem('sakuku_lang') as 'id' | 'en';
      if (savedLang === 'id' || savedLang === 'en') {
        setLocale(savedLang);
      } else if (navigator.language.startsWith('en')) {
        setLocale('en');
      }

      const savedTheme = localStorage.getItem('sakuku_theme');
      const rootHasDark = document.documentElement.classList.contains('dark');
      if (savedTheme === 'dark' || (!savedTheme && rootHasDark)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      } else if (savedTheme === 'light') {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      }
    } catch {}

    // Check Channel Status (WhatsApp Bot Availability & TOTP Config)
    const checkChannelStatus = async () => {
      try {
        const res = await fetch('/api/auth/channel-status');
        if (res.ok) {
          const data: ChannelStatus = await res.json();
          setChannelStatus(data);
          if (!data.waAvailable) {
            // Auto-Failover to Google Authenticator when WhatsApp Bot is offline
            setAuthMode('TOTP_RECOVERY');
          }
        }
      } catch (err) {
        console.error('Error fetching channel status:', err);
      }
    };

    checkChannelStatus();
  }, []);

  // Timer Tick
  useEffect(() => {
    if (timerSeconds <= 0 && cooldownSeconds <= 0 && lockedSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => Math.max(0, prev - 1));
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
      setLockedSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerSeconds, cooldownSeconds, lockedSeconds]);

  const toggleLanguage = () => {
    const next = locale === 'id' ? 'en' : 'id';
    setLocale(next);
    try {
      localStorage.setItem('sakuku_lang', next);
      window.dispatchEvent(new Event('language-change'));
    } catch {}
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('sakuku_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('sakuku_theme', 'light');
      }
      window.dispatchEvent(new Event('theme-change'));
    } catch {}
  };

  // 1. Request OTP Action
  const handleRequestOtp = async () => {
    if (lockedSeconds > 0 || cooldownSeconds > 0 || loading) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        setOtpStep(2);
        setTimerSeconds(180);
        setCooldownSeconds(60);
        setDigits(['', '', '', '', '', '']);
        setSuccessMessage(
          locale === 'id'
            ? 'Kode OTP 6 digit berhasil dikirim ke WhatsApp Anda.'
            : '6-digit OTP code sent successfully to your WhatsApp.'
        );
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      } else {
        if (data.errorCode === 'LOCKED' && data.retryAfterSeconds) {
          setLockedSeconds(data.retryAfterSeconds);
          setErrorMessage(
            locale === 'id'
              ? `Login dikunci selama ${Math.ceil(data.retryAfterSeconds / 60)} menit karena 5x kesalahan.`
              : `Login locked for ${Math.ceil(data.retryAfterSeconds / 60)} min due to 5 failed attempts.`
          );
        } else if (data.errorCode === 'COOLDOWN' && data.retryAfterSeconds) {
          setCooldownSeconds(data.retryAfterSeconds);
          setErrorMessage(
            locale === 'id'
              ? `Tunggu ${data.retryAfterSeconds} detik sebelum meminta kode baru.`
              : `Wait ${data.retryAfterSeconds}s before requesting a new code.`
          );
        } else if (data.errorCode === 'WA_UNAVAILABLE') {
          // Auto-Failover to Google Authenticator
          setAuthMode('TOTP_RECOVERY');
          setErrorMessage(
            locale === 'id'
              ? 'WhatsApp Bot sedang terputus. Beralih otomatis ke Google Authenticator.'
              : 'WhatsApp Bot is offline. Switched automatically to Google Authenticator.'
          );
        } else {
          setErrorMessage(data.error || 'Gagal mengirim kode OTP.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Koneksi gagal.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Verification Code (Auto-called on 6th digit)
  const handleSubmitCode = async (codeToVerify: string) => {
    if (loading || codeToVerify.length !== 6) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const endpoint = authMode === 'WA_OTP' ? '/api/auth/verify-otp' : '/api/auth/verify-totp';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToVerify }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(
          locale === 'id'
            ? 'Autentikasi berhasil! Mengarahkan ke dashboard...'
            : 'Authentication successful! Redirecting to dashboard...'
        );

        if (data.recoveryMode) {
          router.replace('/?recovery=wa');
        } else {
          router.replace('/');
        }
      } else {
        if (data.errorCode === 'LOCKED_NOW' || data.errorCode === 'LOCKED') {
          const secs = data.retryAfterSeconds || 900;
          setLockedSeconds(secs);
          setErrorMessage(
            locale === 'id'
              ? 'Terdeteksi 5x kesalahan input! Akses login dikunci selama 15 menit.'
              : '5 failed attempts detected! Login access locked for 15 minutes.'
          );
        } else if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          setErrorMessage(
            locale === 'id'
              ? `Kode verifikasi salah! Sisa kesempatan: ${data.remainingAttempts}x.`
              : `Invalid verification code! Remaining attempts: ${data.remainingAttempts}x.`
          );
        } else {
          setErrorMessage(data.error || 'Verifikasi gagal.');
        }

        // Reset digits and refocus
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi kode.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Digit KeyDown & Input Change
  const handleDigitChange = (index: number, value: string) => {
    // Handle Paste (e.g. 6 digits at once)
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (cleaned) {
        const nextDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = cleaned[i] || '';
        }
        setDigits(nextDigits);
        const nextIndex = Math.min(cleaned.length, 5);
        inputRefs.current[nextIndex]?.focus();

        if (cleaned.length === 6) {
          handleSubmitCode(cleaned);
        }
      }
      return;
    }

    // Single character input
    const cleanChar = value.replace(/\D/g, '');
    const nextDigits = [...digits];
    nextDigits[index] = cleanChar;
    setDigits(nextDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      handleSubmitCode(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWaMode = authMode === 'WA_OTP';

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden relative flex flex-col items-center justify-center bg-gray-50 dark:bg-[#070b14] px-4 pt-16 pb-8 sm:px-6 sm:py-12 transition-colors duration-200">
      {/* Top Right Controls (Fixed, non-overlapping) */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-20 flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={toggleLanguage}
          className="h-8 sm:h-9 px-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          title={locale === 'id' ? 'Ganti Bahasa' : 'Switch Language'}
        >
          <Globe className="w-3.5 h-3.5 text-gray-400" />
          <span>{locale.toUpperCase()}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
          title={isDark ? 'Mode Terang' : 'Mode Gelap'}
        >
          {mounted ? (
            isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Ambient Background Radial Glow */}
      <div
        className={`absolute w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-radial ${
          isWaMode
            ? 'from-blue-600/15 via-indigo-600/5 to-transparent'
            : 'from-amber-500/15 via-emerald-500/5 to-transparent'
        } blur-3xl pointer-events-none -top-12 -left-12 sm:top-1/4 sm:left-1/3`}
      />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[380px] sm:max-w-md p-5 sm:p-8 bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-xl border border-gray-200/80 dark:border-blue-500/20 shadow-2xl rounded-2xl sm:rounded-3xl break-words">
        {/* Glowing Shield Icon */}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-2xl border flex items-center justify-center shadow-inner transition-colors duration-300 ${
            isWaMode
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-500/30'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-500/30'
          }`}
        >
          {isWaMode ? (
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
          ) : (
            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8" />
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            SakuKu Security Gate
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isWaMode
              ? locale === 'id'
                ? 'Autentikasi Aman Tanpa Sandi via WhatsApp OTP'
                : 'Secure Passwordless Auth via WhatsApp OTP'
              : locale === 'id'
              ? 'Pemulihan Darurat Offline (Google Authenticator)'
              : 'Emergency Offline Recovery (Google Authenticator)'}
          </p>
        </div>

        {/* Offline Banner for Mode 2 (TOTP Recovery) */}
        {!isWaMode && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">
                {locale === 'id' ? 'WhatsApp Bot Sedang Terputus' : 'WhatsApp Bot Disconnected'}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {locale === 'id'
                  ? 'Gunakan 6 digit kode dari aplikasi Google Authenticator / Authy di HP Anda untuk masuk darurat.'
                  : 'Use the 6-digit code from Google Authenticator / Authy app on your phone for emergency access.'}
              </p>
            </div>
          </div>
        )}

        {/* Lockout Warning Alert */}
        {lockedSeconds > 0 && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {locale === 'id' ? 'Login Dikunci Sementara' : 'Login Temporarily Locked'}
              </p>
              <p className="text-[11px] mt-0.5">
                {locale === 'id'
                  ? `Terlalu banyak percobaan salah. Coba lagi dalam ${formatTime(lockedSeconds)}.`
                  : `Too many failed attempts. Try again in ${formatTime(lockedSeconds)}.`}
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && lockedSeconds <= 0 && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium">
            {successMessage}
          </div>
        )}

        {/* CONTENT FOR MODE 1: WHATSAPP OTP */}
        {isWaMode && (
          <>
            {otpStep === 1 ? (
              // Step 1: Request OTP Button
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading || lockedSeconds > 0 || cooldownSeconds > 0}
                  className="w-full h-11 sm:h-12 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {cooldownSeconds > 0
                          ? `${locale === 'id' ? 'Tunggu' : 'Wait'} (${cooldownSeconds}s)`
                          : locale === 'id'
                          ? 'Kirim Kode OTP ke WhatsApp'
                          : 'Send OTP Code to WhatsApp'}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 leading-relaxed">
                  {locale === 'id'
                    ? 'Kode verifikasi 6 digit akan dikirimkan langsung ke nomor WhatsApp pemilik terdaftar.'
                    : 'A 6-digit verification code will be sent directly to the registered owner WhatsApp number.'}
                </p>
              </div>
            ) : (
              // Step 2: 6-Digit OTP Inputs
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      disabled={loading || lockedSeconds > 0}
                      className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl text-lg sm:text-2xl font-bold text-center border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#070b14] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition shadow-inner disabled:opacity-50"
                    />
                  ))}
                </div>

                {/* Timer & Resend Controls */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                  <span>
                    {locale === 'id' ? 'Berlaku:' : 'Expires:'}{' '}
                    <strong className="text-gray-700 dark:text-gray-300 font-mono">
                      {formatTime(timerSeconds)}
                    </strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={cooldownSeconds > 0 || lockedSeconds > 0 || loading}
                    className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      {cooldownSeconds > 0
                        ? `${cooldownSeconds}s`
                        : locale === 'id'
                        ? 'Kirim Ulang'
                        : 'Resend'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* CONTENT FOR MODE 2: GOOGLE AUTHENTICATOR TOTP */}
        {!isWaMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  disabled={loading || lockedSeconds > 0}
                  className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl text-lg sm:text-2xl font-bold text-center border border-amber-200/80 dark:border-amber-500/30 bg-white dark:bg-[#070b14] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition shadow-inner disabled:opacity-50"
                />
              ))}
            </div>

            <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">
              {locale === 'id'
                ? 'Masukkan 6 digit kode yang sedang berjalan di Google Authenticator.'
                : 'Enter the 6-digit active code in your Google Authenticator app.'}
            </p>
          </div>
        )}

        {/* Switch Mode Footer (When TOTP is available) */}
        {channelStatus?.totpConfigured && (
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
            {isWaMode ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('TOTP_RECOVERY');
                  setErrorMessage('');
                  setSuccessMessage('');
                  setDigits(['', '', '', '', '', '']);
                }}
                className="text-xs text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 transition font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {locale === 'id'
                    ? 'Masuk via Google Authenticator'
                    : 'Sign in via Google Authenticator'}
                </span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('WA_OTP');
                  setErrorMessage('');
                  setSuccessMessage('');
                  setDigits(['', '', '', '', '', '']);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3 h-3" />
                <span>
                  {locale === 'id' ? 'Gunakan WhatsApp OTP' : 'Use WhatsApp OTP'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
