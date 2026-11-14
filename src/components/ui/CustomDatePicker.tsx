'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
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

  const monthsShort = locale === 'id'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  // Initialize view year & month from current value or today
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
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

  // Update view when value prop changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

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

  // Calendar calculations
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
    onChange(todayIso);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const months = locale === 'id' ? MONTHS_ID : MONTHS_EN;
  const daysOfWeek = locale === 'id' ? DAYS_ID : DAYS_EN;

  const defaultPlaceholder =
    placeholder || (locale === 'id' ? 'Pilih tanggal...' : 'Select date...');

  // Size styling variants
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-3 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl gap-2.5',
  }[size];

  // Calendar render content
  const calendarContent = (
    <div
      ref={popoverRef}
      className="w-[300px] select-none text-gray-900 dark:text-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Month & Year Navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1">
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

        <div className="font-bold text-sm tracking-tight text-gray-900 dark:text-white select-none px-2 text-center">
          {months[viewMonth]} {viewYear}
        </div>

        <div className="flex items-center gap-1">
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

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
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

      {/* Popover on Desktop / Modal on Mobile */}
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
            /* Desktop View: Popover floating near trigger with boundary safety */
            <div
              className="absolute left-0 mt-1.5 z-50 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
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
