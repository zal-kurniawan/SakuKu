'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSakuKuTheme } from '@/hooks/useSakuKuTheme';
import {
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  Loader2,
  LogIn,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // Standalone Locale & Unified Theme
  const [locale, setLocale] = useState<'id' | 'en'>('id');
  const { isDark, toggleTheme, mounted } = useSakuKuTheme();

  // 6 Digits Input State
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Lockout & Error States
  const [lockedSeconds, setLockedSeconds] = useState<number>(0); // 15-minute lockout
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Initialize Locale from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('sakuku_lang') as 'id' | 'en';
      if (savedLang === 'id' || savedLang === 'en') {
        setLocale(savedLang);
      } else if (navigator.language.startsWith('en')) {
        setLocale('en');
      }
    } catch {}

    // Focus on first input box
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, []);

  // Lockout Timer Countdown Tick
  useEffect(() => {
    if (lockedSeconds <= 0) return;

    const interval = setInterval(() => {
      setLockedSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedSeconds]);

  const toggleLanguage = () => {
    const next = locale === 'id' ? 'en' : 'id';
    setLocale(next);
    try {
      localStorage.setItem('sakuku_lang', next);
      window.dispatchEvent(new Event('language-change'));
    } catch {}
  };

  // Submit Verification Code (Auto-called on 6th digit or via button)
  const handleSubmitCode = async (codeToVerify: string) => {
    if (loading || codeToVerify.length !== 6 || lockedSeconds > 0) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/verify-totp', {
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
        router.replace('/');
      } else {
        if (data.errorCode === 'LOCKED_NOW' || data.errorCode === 'LOCKED') {
          const secs = data.retryAfterSeconds || 900;
          setLockedSeconds(secs);
          setErrorMessage(
            locale === 'id'
              ? `Terdeteksi 5x kesalahan input! Akses login dikunci selama ${Math.ceil(secs / 60)} menit.`
              : `5 failed attempts detected! Login access locked for ${Math.ceil(secs / 60)} minutes.`
          );
        } else if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          setErrorMessage(
            locale === 'id'
              ? `Kode verifikasi salah! Sisa kesempatan: ${data.remainingAttempts}x.`
              : `Invalid verification code! Remaining attempts: ${data.remainingAttempts}x.`
          );
        } else {
          setErrorMessage(data.error || (locale === 'id' ? 'Verifikasi gagal.' : 'Verification failed.'));
        }

        // Reset digits and refocus to first input box
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMessage(err.message || (locale === 'id' ? 'Koneksi gagal.' : 'Network connection failed.'));
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

  const isFormComplete = digits.every((d) => d.length === 1);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden relative flex flex-col items-center justify-center bg-gray-50 dark:bg-[#070b14] px-4 pt-16 pb-8 sm:px-6 sm:py-12 transition-colors duration-200">
      {/* Top Right Controls (Fixed, non-overlapping) */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-20 flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleLanguage}
          className="h-8 sm:h-9 px-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          title={locale === 'id' ? 'Ganti Bahasa' : 'Switch Language'}
        >
          <Globe className="w-3.5 h-3.5 text-gray-400" />
          <span>{locale.toUpperCase()}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
          title={isDark ? (locale === 'id' ? 'Mode Terang' : 'Light Mode') : (locale === 'id' ? 'Mode Gelap' : 'Dark Mode')}
          aria-label={isDark ? (locale === 'id' ? 'Mode Terang' : 'Light Mode') : (locale === 'id' ? 'Mode Gelap' : 'Dark Mode')}
        >
          {mounted ? (
            isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 ease-out hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600 transition-transform duration-300 ease-out hover:-rotate-12" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Ambient Background Radial Glow */}
      <div className="absolute w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-radial from-blue-600/15 via-emerald-600/5 to-transparent blur-3xl pointer-events-none -top-12 -left-12 sm:top-1/4 sm:left-1/3" />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[380px] sm:max-w-md p-5 sm:p-8 bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-xl border border-gray-200/80 dark:border-blue-500/20 shadow-2xl rounded-2xl sm:rounded-3xl break-words">
        {/* Glowing Shield Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-2xl border flex items-center justify-center shadow-inner transition-colors duration-300 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-500/30">
          <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            SakuKu Security Gate
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            {locale === 'id'
              ? 'Masukkan 6 digit kode verifikasi dari aplikasi Google Authenticator Anda.'
              : 'Enter the 6-digit verification code from your Google Authenticator app.'}
          </p>
        </div>

        {/* Alert Error Box */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl text-xs sm:text-sm border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 min-w-0 font-medium leading-relaxed">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Alert Success Box */}
        {successMessage && (
          <div className="mb-5 p-3 rounded-xl text-xs sm:text-sm border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in duration-200">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* 6-Digit TOTP Input Boxes */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitCode(digits.join(''));
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
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

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={!isFormComplete || loading || lockedSeconds > 0}
            className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>
                  {locale === 'id' ? 'Memverifikasi...' : 'Verifying...'}
                </span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 shrink-0" />
                <span>
                  {locale === 'id' ? 'Verifikasi & Masuk' : 'Verify & Sign In'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Lockout Countdown Timer Message */}
        {lockedSeconds > 0 && (
          <p className="mt-4 text-center text-xs text-red-500 font-medium">
            {locale === 'id'
              ? `Terkunci: Coba lagi dalam ${Math.floor(lockedSeconds / 60)}m ${lockedSeconds % 60}s.`
              : `Locked: Try again in ${Math.floor(lockedSeconds / 60)}m ${lockedSeconds % 60}s.`}
          </p>
        )}

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
            <KeyRound className="w-3 h-3 text-blue-500" />
            <span>
              {locale === 'id'
                ? 'Dilindungi oleh Google Authenticator'
                : 'Protected by Google Authenticator'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
