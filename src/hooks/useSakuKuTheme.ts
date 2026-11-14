'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';

/**
 * Updates or creates the <meta name="theme-color"> tag in document.head
 */
function updateThemeColorMeta(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const color = theme === 'dark' ? '#030712' : '#f9fafb';
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

/**
 * Unified SakuKu Theme Hook
 * Provides single-source-of-truth theme management with instant 1-click toggle,
 * synchronous DOM class synchronization, zero FOUC, and 60fps synchronous view transitions.
 */
export function useSakuKuTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // Sync theme-color meta tag on initial mount
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    updateThemeColorMeta(isCurrentlyDark ? 'dark' : 'light');

    // Listen to custom cross-component theme changes
    const handleThemeChange = () => {
      setMounted((prev) => (!prev ? true : prev));
    };

    window.addEventListener('sakuku-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('sakuku-theme-change', handleThemeChange);
    };
  }, []);

  // Determine active state: If mounted, inspect actual DOM class or resolvedTheme; default to dark
  const isDark = mounted
    ? resolvedTheme
      ? resolvedTheme === 'dark'
      : typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
    : true;

  const toggleTheme = useCallback(() => {
    if (typeof document === 'undefined') return;

    // 1. Read current active state directly from DOM class (100% accurate, no race conditions)
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextTheme: 'dark' | 'light' = isCurrentlyDark ? 'light' : 'dark';

    // 2. Synchronous theme applicator
    const applyThemeSynchronously = () => {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.style.colorScheme = nextTheme;
      updateThemeColorMeta(nextTheme);

      // Update next-themes and persistent storage
      setTheme(nextTheme);
      try {
        localStorage.setItem('sakuku-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        localStorage.setItem('sakuku_theme', nextTheme);
        window.dispatchEvent(new CustomEvent('sakuku-theme-change', { detail: nextTheme }));
      } catch {}
    };

    // 3. Disable per-element CSS transitions during theme swap (prevents stagger/delay)
    document.documentElement.classList.add('theme-switching');

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 4. Primary: Native View Transitions API for 60fps GPU cross-fade
    if (
      'startViewTransition' in document &&
      typeof (document as any).startViewTransition === 'function' &&
      !prefersReducedMotion
    ) {
      const transition = (document as any).startViewTransition(() => {
        flushSync(() => {
          applyThemeSynchronously();
        });
      });

      transition.finished.finally(() => {
        document.documentElement.classList.remove('theme-switching');
      });
    } else {
      // 5. Fallback: Lightweight GPU Cross-Fade Veil (for older Safari / WebViews)
      const veil = document.createElement('div');
      veil.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
        will-change: opacity;
        background-color: ${isCurrentlyDark ? '#030712' : '#f9fafb'};
        opacity: 1;
        transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
      `;
      document.body.appendChild(veil);

      applyThemeSynchronously();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          veil.style.opacity = '0';
          setTimeout(() => {
            veil.remove();
            document.documentElement.classList.remove('theme-switching');
          }, 240);
        });
      });
    }
  }, [setTheme]);

  return {
    isDark,
    theme: resolvedTheme || theme || 'dark',
    setTheme,
    toggleTheme,
    mounted,
  };
}
