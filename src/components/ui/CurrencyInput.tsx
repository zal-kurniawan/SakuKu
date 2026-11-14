'use client';

import React, { useRef, useEffect, useState, useId } from 'react';

export interface CurrencyInputProps {
  value: number | string;
  onChange: (numericValue: number, formatted: string) => void;
  placeholder?: string;
  prefix?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  autoFocus?: boolean;
  'aria-label'?: string;
}

// Formats a raw number or digit string with Indonesian thousand dot separator
export function formatThousands(val: string | number): string {
  if (val === '' || val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  prefix = 'Rp',
  disabled = false,
  required = false,
  min,
  max,
  className = '',
  inputClassName = '',
  size = 'md',
  id,
  name,
  autoFocus = false,
  'aria-label': ariaLabel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id || autoId;

  // Local display state (formatted with dots)
  const [displayValue, setDisplayValue] = useState<string>(() => {
    return formatThousands(value);
  });

  // Sync internal displayValue when external value changes
  useEffect(() => {
    const formatted = formatThousands(value);
    setDisplayValue(formatted);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const inputElement = inputRef.current;
    const oldCaretPos = inputElement?.selectionStart || 0;

    // Count how many pure digits are to the left of the caret before updating
    const digitsBeforeCaret = rawInput.slice(0, oldCaretPos).replace(/\D/g, '').length;

    // Clean all non-digits
    const cleanDigits = rawInput.replace(/\D/g, '');
    let numeric = cleanDigits ? parseInt(cleanDigits, 10) : 0;

    if (max !== undefined && numeric > max) {
      numeric = max;
    }

    const formatted = formatThousands(cleanDigits);
    setDisplayValue(formatted);
    onChange(numeric, formatted);

    // Smoothly restore caret position relative to the pure digit index
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newCaretPos = 0;
      let digitCount = 0;

      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        if (digitCount === digitsBeforeCaret) {
          newCaretPos = i + 1;
          break;
        }
      }

      if (digitsBeforeCaret === 0) newCaretPos = 0;
      if (digitsBeforeCaret > cleanDigits.length) newCaretPos = formatted.length;

      inputRef.current.setSelectionRange(newCaretPos, newCaretPos);
    });
  };

  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-10 text-xs sm:text-sm px-3',
    lg: 'min-h-[44px] text-sm px-3.5',
  }[size];

  const prefixPadding = prefix ? (size === 'sm' ? 'pl-8' : size === 'lg' ? 'pl-11' : 'pl-10') : '';

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Hidden input for standard HTML form submission */}
      {name && <input type="hidden" name={name} value={String(value || 0)} />}

      {/* Prefix Label (e.g. 'Rp') */}
      {prefix && (
        <span
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 dark:text-gray-500 select-none ${
            size === 'sm' ? 'text-xs' : 'text-sm'
          }`}
        >
          {prefix}
        </span>
      )}

      {/* Main Text Input with Numeric InputMode */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        id={inputId}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className={`w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1623] text-gray-900 dark:text-white font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${sizeClasses} ${prefixPadding} ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            : 'hover:border-gray-300 dark:hover:border-gray-700'
        } ${inputClassName}`}
      />
    </div>
  );
};

export default CurrencyInput;
