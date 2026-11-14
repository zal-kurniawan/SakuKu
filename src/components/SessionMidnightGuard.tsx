'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wallet } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { getJakartaDateKey, getNextJakartaMidnight } from '@/lib/timezone';

/**
 * SessionMidnightGuard
 *
 * Ensures the SakuKu authenticated dashboard immediately refreshes and redirects to /login
 * upon crossing 00:00:00 Asia/Jakarta time (WIB / UTC+07:00).
 *
 * Provides 4 layers of triggers:
 * 1. Exact timer scheduled to next 00:00:00 WIB
 * 2. Mobile tab wake-up, bfcache restore, & focus listeners (visibilitychange, pageshow, focus)
 * 3. Heartbeat interval check every 15 seconds
 * 4. Global fetch interceptor catching any 401 Unauthorized API responses
 *
 * Displays a full-screen privacy/loading mask before reload so stale financial data is never exposed.
 */
export const SessionMidnightGuard: React.FC = () => {
  const { locale } = useTranslation();
  const [isReloading, setIsReloading] = useState(false);
  const hasReloadedRef = useRef(false);
  const initialJakartaDayRef = useRef<string | null>(null);
  const targetMidnightMsRef = useRef<number | null>(null);

  const triggerMidnightReload = useCallback(() => {
    if (hasReloadedRef.current) return;
    hasReloadedRef.current = true;
    setIsReloading(true);

    // Brief timeout so browser paints privacy overlay before reload starts
    setTimeout(() => {
      try {
        window.location.reload();
        // Fallback to explicit /login navigation if browser aborts reload
        setTimeout(() => {
          window.location.replace('/login');
        }, 1000);
      } catch {
        window.location.replace('/login');
      }
    }, 150);
  }, []);

  const checkExpiry = useCallback(() => {
    if (hasReloadedRef.current) return;
    const now = new Date();
    const currentDay = getJakartaDateKey(now);
    const targetMs = targetMidnightMsRef.current;
    const initialDay = initialJakartaDayRef.current;

    if (
      (targetMs !== null && now.getTime() >= targetMs) ||
      (initialDay !== null && currentDay !== initialDay)
    ) {
      triggerMidnightReload();
    }
  }, [triggerMidnightReload]);

  useEffect(() => {
    const now = new Date();
    initialJakartaDayRef.current = getJakartaDateKey(now);
    const targetMs = getNextJakartaMidnight(now).getTime();
    targetMidnightMsRef.current = targetMs;

    // Check immediately in case page was restored from frozen memory past midnight
    checkExpiry();

    // 1. Exact Timer towards next 00:00:00 WIB
    const delay = Math.max(0, targetMs - Date.now() + 250);
    const timerId = setTimeout(() => {
      checkExpiry();
    }, delay);

    // 2. Mobile tab wake-up, bfcache restore, & focus listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkExpiry();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      checkExpiry();
    };

    const handleFocus = () => {
      checkExpiry();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    // 3. Heartbeat Interval check every 15 seconds
    const intervalId = setInterval(checkExpiry, 15000);

    // 4. Global fetch interceptor to catch any 401 Unauthorized API responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response.status === 401) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
          if (!url.includes('/api/auth/verify-totp')) {
            triggerMidnightReload();
          }
        }
        return response;
      } catch (err) {
        throw err;
      }
    };

    return () => {
      clearTimeout(timerId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.fetch = originalFetch;
    };
  }, [checkExpiry, triggerMidnightReload]);

  if (isReloading) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-white dark:bg-[#0b101b] text-gray-900 dark:text-white transition-opacity animate-in fade-in duration-200"
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {locale === 'en' ? 'Updating SakuKu Session...' : 'Memperbarui Sesi SakuKu...'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {locale === 'en'
                ? 'Midnight reached (00:00 WIB). Refreshing secure session...'
                : 'Mencapai batas tengah malam (00:00 WIB). Memuat ulang sesi aman...'}
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return null;
};
