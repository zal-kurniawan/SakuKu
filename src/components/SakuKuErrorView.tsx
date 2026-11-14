'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, Globe, LucideIcon } from 'lucide-react';
import { useSakuKuTheme } from '@/hooks/useSakuKuTheme';

export interface ErrorAction {
  label: { id: string; en: string };
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: LucideIcon;
}

export interface SakuKuErrorViewProps {
  statusCode: number | string;
  badge: { id: string; en: string };
  title: { id: string; en: string };
  description: { id: string; en: string };
  icon: LucideIcon;
  iconAccentColor?: 'red' | 'amber' | 'blue' | 'rose' | 'emerald';
  actions: ErrorAction[];
}

export const SakuKuErrorView: React.FC<SakuKuErrorViewProps> = ({
  statusCode,
  badge,
  title,
  description,
  icon: IconComponent,
  iconAccentColor = 'blue',
  actions,
}) => {
  // Locale management & Unified SakuKu Theme
  const [locale, setLocale] = useState<'id' | 'en'>('id');
  const { isDark, toggleTheme, mounted } = useSakuKuTheme();

  useEffect(() => {
    // Sync Language
    try {
      const savedLang = localStorage.getItem('sakuku_lang') as 'id' | 'en';
      if (savedLang === 'id' || savedLang === 'en') {
        setLocale(savedLang);
      } else if (navigator.language.startsWith('en')) {
        setLocale('en');
      }
    } catch {}
  }, []);

  const toggleLanguage = () => {
    const nextLang = locale === 'id' ? 'en' : 'id';
    setLocale(nextLang);
    try {
      localStorage.setItem('sakuku_lang', nextLang);
      window.dispatchEvent(new Event('language-change'));
    } catch {}
  };

  // Accent styling mappings
  const accentClasses = {
    red: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/25',
      radial: 'from-rose-500/15 via-rose-500/5 to-transparent',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-500/30',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/25',
      radial: 'from-amber-500/15 via-amber-500/5 to-transparent',
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-500/30',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/25',
      radial: 'from-blue-500/15 via-indigo-500/5 to-transparent',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/25',
      radial: 'from-rose-500/15 via-orange-500/5 to-transparent',
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/25',
      radial: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    },
  }[iconAccentColor];

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

      {/* Ambient Radial Background Glow */}
      <div
        className={`absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-radial ${accentClasses.radial} blur-3xl pointer-events-none -top-12 -left-12 sm:top-1/4 sm:left-1/3`}
      />

      {/* Main Glassmorphic Error Card */}
      <div className="relative z-10 w-full max-w-[360px] sm:max-w-md p-5 sm:p-8 text-center bg-white/90 dark:bg-[#0f1623]/90 backdrop-blur-xl border border-gray-200/80 dark:border-blue-500/20 shadow-2xl rounded-2xl sm:rounded-3xl break-words">
        {/* Glowing Icon */}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-2xl border ${accentClasses.bg} flex items-center justify-center shadow-inner`}
        >
          <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        {/* Status Badge */}
        <div className="inline-block">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider uppercase mb-3 ${accentClasses.badge}`}
          >
            {badge[locale]}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug mb-2">
          {title[locale]}
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          {description[locale]}
        </p>

        {/* Responsive Actions */}
        <div
          className={`w-full ${
            actions.length > 1
              ? 'flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3'
              : 'flex flex-col gap-2'
          }`}
        >
          {actions.map((act, idx) => {
            const isPrimary = act.variant === 'primary' || (!act.variant && idx === 0);
            const isSecondary = act.variant === 'secondary';
            const ActionIcon = act.icon;

            const btnClasses = isPrimary
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border border-transparent'
              : isSecondary
              ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20';

            const content = (
              <>
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                <span>{act.label[locale]}</span>
              </>
            );

            if (act.href) {
              return (
                <Link
                  key={idx}
                  href={act.href}
                  className={`w-full ${
                    actions.length > 1 ? 'sm:flex-1' : ''
                  } h-10 sm:h-11 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition active:scale-[0.98] ${btnClasses}`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={act.onClick}
                className={`w-full ${
                  actions.length > 1 ? 'sm:flex-1' : ''
                } h-10 sm:h-11 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${btnClasses}`}
              >
                {content}
              </button>
            );
          })}
        </div>

        {/* Brand Watermark */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-400 dark:text-gray-500">
          SakuKu Security Architecture
        </div>
      </div>
    </div>
  );
};
