'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback } from 'react';

/**
 * Unified SakuKu Theme Hook
 * Provides single-source-of-truth theme management with instant 1-click toggle,
 * synchronous DOM class synchronization, zero FOUC, and silky-smooth CSS transitions.
 */
export function useSakuKuTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // Listen to custom cross-component theme changes
    const handleThemeChange = () => {
      // Force component re-render when theme changes elsewhere
      setMounted((prev) => !prev ? true : prev);
    };

    window.addEventListener('sakuku-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('sakuku-theme-change', handleThemeChange);
    };
  }, []);

  // Determine active state: If mounted, inspect actual DOM class or resolvedTheme; default to dark
  const isDark = mounted
    ? (resolvedTheme ? resolvedTheme === 'dark' : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true))
    : true;

  const toggleTheme = useCallback(() => {
    // 1. Read current active state directly from DOM class (100% accurate, no race conditions)
    const isCurrentlyDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const nextTheme: 'dark' | 'light' = isCurrentlyDark ? 'light' : 'dark';

    // 2. Add transition class for controlled 300ms silky-smooth color fade
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-transitioning');

      // 3. Immediately apply to DOM class and style.colorScheme synchronously
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.style.colorScheme = nextTheme;
    }

    // 4. Update next-themes and keep all storage keys synchronized
    setTheme(nextTheme);
    try {
      localStorage.setItem('sakuku-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      localStorage.setItem('sakuku_theme', nextTheme);
      window.dispatchEvent(new CustomEvent('sakuku-theme-change', { detail: nextTheme }));
    } catch {}

    // 5. Remove transition class after animation completes (prevents sluggishness on normal scroll/interactions)
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('theme-transitioning');
      }
    }, 320);
  }, [setTheme]);

  return {
    isDark,
    theme: resolvedTheme || theme || 'dark',
    setTheme,
    toggleTheme,
    mounted,
  };
}
