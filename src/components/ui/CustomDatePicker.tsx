'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

export interface CustomDatePickerProps {
  value: string; // ISO string 'YYYY-MM-DD'
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string; // 'YYYY-MM-DD'
  maxDate?: string; // 'YYYY-MM-DD'
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  'aria-label'?: string;
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTHS_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format ISO YYYY-MM-DD to readable date
function formatDisplayDate(iso: string, locale: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const monthsShort = locale === 'id' ? MONTHS_SHORT_ID : MONTHS_SHORT_EN;
  return `${day} ${monthsShort[monthIdx] || ''} ${year}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
  disabled = false,
  clearable = false,
  className = '',
  triggerClassName = '',
  size = 'md',
  id,
  name,
  'aria-label': ariaLabel,
}) => {
  const { locale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  // Drill-up navigation mode: 'days' -> 'months' -> 'years'
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Initialize view year & month from current value or today
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );

  // 12-year window start year (e.g. 2020 for 2026)
  const [yearPageStart, setYearPageStart] = useState<number>(() =>
    Math.floor((isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()) / 10) * 10
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const inputId = id || autoId;

  // Detect mobile viewport (< 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Viewport collision detection on Desktop
  useEffect(() => {
    if (isOpen && !isMobile && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < 340 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, isMobile]);

  // Reset viewMode to 'days' and sync year & month whenever calendar opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('days');
      const d = value ? new Date(value) : new Date();
      const validYear = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
      const validMonth = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
      setViewYear(validYear);
      setViewMonth(validMonth);
      setYearPageStart(Math.floor(validYear / 10) * 10);
    }
  }, [isOpen, value]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calendar calculations for Day View
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const isoString = `${viewYear}-${formattedMonth}-${formattedDay}`;

    if (minDate && isoString < minDate) return;
    if (maxDate && isoString > maxDate) return;

    onChange(isoString);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelectToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayIso = `${yyyy}-${mm}-${dd}`;

    if (minDate && todayIso < minDate) return;
    if (maxDate && todayIso > maxDate) return;

    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setViewMode('days');
    onChange(todayIso);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const months = locale === 'id' ? MONTHS_ID : MONTHS_EN;
  const shortMonths = locale === 'id' ? MONTHS_SHORT_ID : MONTHS_SHORT_EN;
  const daysOfWeek = locale === 'id' ? DAYS_ID : DAYS_EN;

  const defaultPlaceholder =
    placeholder || (locale === 'id' ? 'Pilih tanggal...' : 'Select date...');

  // Parsed parts for accurate comparison
  const selectedParts = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1,
      day: parseInt(parts[2], 10),
    };
  }, [value]);

  const todayParts = useMemo(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  }, []);

  // Size styling variants
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-3 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl gap-2.5',
  }[size];

  // Calendar Header depending on viewMode
  const renderHeader = () => {
    if (viewMode === 'days') {
      return (
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
              aria-label="Previous year"
              title={locale === 'id' ? 'Tahun Sebelumnya' : 'Previous Year'}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
              aria-label="Previous month"
              title={locale === 'id' ? 'Bulan Sebelumnya' : 'Previous Month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Drill-up button to Month view */}
          <button
            type="button"
            onClick={() => setViewMode('months')}
            className="px-2.5 py-1 rounded-lg text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1 transition-colors cursor-pointer"
            title={locale === 'id' ? 'Pilih Bulan' : 'Select Month'}
          >
            <span>
              {months[viewMonth]} {viewYear}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
              aria-label="Next month"
              title={locale === 'id' ? 'Bulan Berikutnya' : 'Next Month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
              aria-label="Next year"
              title={locale === 'id' ? 'Tahun Berikutnya' : 'Next Year'}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    if (viewMode === 'months') {
      return (
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
            aria-label="Previous year"
            title={locale === 'id' ? 'Tahun Sebelumnya' : 'Previous Year'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Drill-up button to Year view */}
          <button
            type="button"
            onClick={() => {
              setYearPageStart(Math.floor(viewYear / 10) * 10);
              setViewMode('years');
            }}
            className="px-3 py-1 rounded-lg text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1 transition-colors cursor-pointer"
            title={locale === 'id' ? 'Pilih Tahun' : 'Select Year'}
          >
            <span>{viewYear}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
            aria-label="Next year"
            title={locale === 'id' ? 'Tahun Berikutnya' : 'Next Year'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      );
    }

    // viewMode === 'years'
    return (
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <button
          type="button"
          onClick={() => setYearPageStart((y) => y - 12)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
          aria-label="Previous 12 years"
          title={locale === 'id' ? '12 Tahun Sebelumnya' : 'Previous 12 Years'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="font-bold text-sm tracking-tight text-gray-900 dark:text-white select-none px-2 text-center">
          {yearPageStart} – {yearPageStart + 11}
        </div>

        <button
          type="button"
          onClick={() => setYearPageStart((y) => y + 12)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
          aria-label="Next 12 years"
          title={locale === 'id' ? '12 Tahun Berikutnya' : 'Next 12 Years'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Calendar Content
  const calendarContent = (
    <div
      ref={popoverRef}
      className="w-[280px] sm:w-[296px] select-none text-gray-900 dark:text-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header Navigation */}
      {renderHeader()}

      {/* 2. Body Area with Consistent Minimum Height (Zero Layout Jump) */}
      <div className="min-h-[216px] flex flex-col justify-center">
        {/* LEVEL 1: DAY VIEW */}
        {viewMode === 'days' && (
          <div>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">
              {daysOfWeek.map((day, i) => (
                <div key={day} className={`py-1 ${i === 0 ? 'text-rose-500/80 dark:text-rose-400/80' : ''}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells Grid (7 cols) */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Previous Month Padding */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-8 flex items-center justify-center text-xs text-gray-300 dark:text-gray-600 select-none pointer-events-none"
                  >
                    {prevDay}
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const currentDayIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = value === currentDayIso;
                const isToday = todayIso === currentDayIso;

                const isDisabled =
                  Boolean(minDate && currentDayIso < minDate) ||
                  Boolean(maxDate && currentDayIso > maxDate);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDay(day)}
                    className={`h-8 w-8 mx-auto flex items-center justify-center text-xs font-medium rounded-lg transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30'
                        : isToday
                        ? 'text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/60 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        : isDisabled
                        ? 'opacity-25 pointer-events-none text-gray-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer active:scale-95'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 2: MONTH VIEW (3x4 Grid) */}
        {viewMode === 'months' && (
          <div className="grid grid-cols-3 gap-2 py-1">
            {shortMonths.map((mShort, idx) => {
              const firstDay = `${viewYear}-${String(idx + 1).padStart(2, '0')}-01`;
              const lastDay = `${viewYear}-${String(idx + 1).padStart(2, '0')}-${new Date(viewYear, idx + 1, 0).getDate()}`;
              const isDisabled =
                Boolean(minDate && lastDay < minDate) ||
                Boolean(maxDate && firstDay > maxDate);

              const isSelected =
                Boolean(selectedParts && selectedParts.year === viewYear && selectedParts.month === idx);
              const isCurrentMonth = todayParts.year === viewYear && todayParts.month === idx;

              return (
                <button
                  key={mShort}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setViewMonth(idx);
                    setViewMode('days');
                  }}
                  className={`h-10 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30'
                      : isCurrentMonth
                      ? 'ring-1 ring-blue-500/50 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : isDisabled
                      ? 'opacity-35 pointer-events-none text-gray-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
                  }`}
                >
                  {mShort}
                </button>
              );
            })}
          </div>
        )}

        {/* LEVEL 3: YEAR VIEW (3x4 Grid, 12 years) */}
        {viewMode === 'years' && (
          <div className="grid grid-cols-3 gap-2 py-1">
            {Array.from({ length: 12 }).map((_, i) => {
              const yr = yearPageStart + i;
              const firstDay = `${yr}-01-01`;
              const lastDay = `${yr}-12-31`;
              const isDisabled =
                Boolean(minDate && lastDay < minDate) ||
                Boolean(maxDate && firstDay > maxDate);

              const isSelected = Boolean(selectedParts && selectedParts.year === yr);
              const isCurrentYear = todayParts.year === yr;

              return (
                <button
                  key={yr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setViewYear(yr);
                    setViewMode('months');
                  }}
                  className={`h-10 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30'
                      : isCurrentYear
                      ? 'ring-1 ring-blue-500/50 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : isDisabled
                      ? 'opacity-35 pointer-events-none text-gray-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Footer Controls */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectToday}
            className="px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold transition cursor-pointer"
          >
            {t('transactions.today') || (locale === 'id' ? 'Hari Ini' : 'Today')}
          </button>

          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition cursor-pointer"
            >
              {locale === 'id' ? 'Hapus' : 'Clear'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 transition cursor-pointer"
        >
          {t('transactions.close') || (locale === 'id' ? 'Tutup' : 'Close')}
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative inline-block w-full select-none ${className}`}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={inputId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between border transition-all text-left font-medium cursor-pointer ${sizeClasses} ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-70'
            : isOpen
            ? 'bg-white dark:bg-[#0f1623] text-gray-900 dark:text-white border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/30'
            : 'bg-white dark:bg-[#0f1623] text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-[#131b2c]'
        } ${triggerClassName}`}
      >
        <span className="truncate flex-1 min-w-0 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <span className={`truncate ${!value ? 'text-gray-400 dark:text-gray-500 font-normal' : ''}`}>
            {value ? formatDisplayDate(value, locale) : defaultPlaceholder}
          </span>
        </span>

        {clearable && value && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </button>

      {/* Popover on Desktop / Centered Modal on Mobile */}
      {isOpen && (
        <>
          {isMobile ? (
            /* Mobile View: Fixed Centered Backdrop Modal */
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="w-full max-w-[320px] rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xl p-4 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {calendarContent}
              </div>
            </div>
          ) : (
            /* Desktop View: Popover floating near trigger with boundary collision safety */
            <div
              className={`absolute left-0 z-50 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150 ${
                openUpward ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-2 origin-top-left'
              }`}
            >
              {calendarContent}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomDatePicker;
