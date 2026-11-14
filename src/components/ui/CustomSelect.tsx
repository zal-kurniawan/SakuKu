'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  'aria-label'?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  size = 'md',
  id,
  name,
  'aria-label': ariaLabel,
  icon,
  isActive = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const selectId = id || autoId;

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel =
    typeof selectedOption?.label === 'string'
      ? selectedOption.label
      : typeof placeholder === 'string'
      ? placeholder
      : undefined;

  // Measure collision with bottom of viewport when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If space below is less than 240px and space above is greater, open upward
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Handle click outside and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < options.length - 1 ? prev + 1 : 0;
          return options[next]?.disabled ? (next + 1) % options.length : next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : options.length - 1;
          return options[next]?.disabled ? (next - 1 + options.length) % options.length : next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0 && options[focusedIndex] && !options[focusedIndex].disabled) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
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
  }, [isOpen, focusedIndex, options, onChange]);

  // Reset focused index when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  // Size styling variants
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-3 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl gap-2.5',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full select-none ${className}`}
    >
      {/* Hidden input for HTML form accessibility/native submission */}
      {name && <input type="hidden" name={name} value={String(value)} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        title={selectedLabel}
        className={`w-full flex items-center justify-between border transition-all text-left font-medium cursor-pointer ${sizeClasses} ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-70'
            : isOpen
            ? 'bg-white dark:bg-[#0f1623] text-gray-900 dark:text-white border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/30'
            : isActive
            ? 'bg-blue-500/8 dark:bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 font-medium'
            : 'bg-white dark:bg-[#0f1623] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-[#131b2c]'
        } ${triggerClassName}`}
      >
        <span className="truncate flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {icon ? (
            <span className="w-3.5 h-3.5 shrink-0 opacity-75 flex items-center justify-center">
              {icon}
            </span>
          ) : selectedOption?.icon ? (
            <span className="shrink-0 flex items-center">{selectedOption.icon}</span>
          ) : null}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDown
          className={`${iconSizes} ${
            isActive && !isOpen ? 'text-blue-500/80' : 'text-gray-400 dark:text-gray-500'
          } shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 right-0 z-50 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-1.5 max-h-60 overflow-y-auto overscroll-contain animate-in fade-in duration-150 ${
            openUpward ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
          } ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className="py-3 px-3 text-xs text-center text-gray-400 dark:text-gray-500">
              Tidak ada pilihan
            </div>
          ) : (
            options.map((option, idx) => {
              const isSelected = option.value === value;
              const isFocused = idx === focusedIndex;

              return (
                <div
                  key={String(option.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange(option.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed text-gray-400'
                      : isSelected
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                      : isFocused
                      ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className="truncate flex items-center gap-2 flex-1 min-w-0 pr-2">
                    {option.icon && (
                      <span className="shrink-0 flex items-center">{option.icon}</span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>

                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
