'use client';

import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

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
  usePortal?: boolean;
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
  usePortal = true,
}: CustomSelectProps<T>) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [portalCoords, setPortalCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const autoId = useId();
  const selectId = id || autoId;

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel =
    typeof selectedOption?.label === 'string'
      ? selectedOption.label
      : typeof placeholder === 'string'
      ? placeholder
      : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile viewport (< 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Measure collision with bottom of viewport for inline mode (usePortal = false)
  useEffect(() => {
    if (isOpen && !usePortal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If space below is less than 230px and space above is greater, open upward
      if (spaceBelow < 230 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, usePortal]);

  // Precise coordinates calculation for portal mode (usePortal = true on desktop)
  const updatePortalCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Auto-close if trigger has scrolled out of viewport or is hidden
    if (
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      (rect.width === 0 && rect.height === 0)
    ) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = Math.min(220, options.length * 40 + 16);

    let placement: 'bottom' | 'top' = 'bottom';
    let top = rect.bottom + 6;

    // Flip to top if space below is insufficient (< 230px) and space above is larger
    if (spaceBelow < 230 && spaceAbove > spaceBelow) {
      placement = 'top';
      top = rect.top - popoverHeight - 6;
    }

    setPortalCoords({
      top,
      left: rect.left,
      width: rect.width,
      placement,
    });
  }, [options.length]);

  // Synchronously compute portal position before browser paint (anti-fly-in)
  useIsomorphicLayoutEffect(() => {
    if (isOpen && usePortal && !isMobile) {
      updatePortalCoords();
    } else if (!isOpen) {
      setPortalCoords(null);
    }
  }, [isOpen, usePortal, isMobile, updatePortalCoords]);

  // Real-time anchored scroll tracking with requestAnimationFrame (capture: true for modal scrolls)
  useEffect(() => {
    if (isOpen && usePortal && !isMobile) {
      let rafId: number | null = null;
      const handleScrollOrResize = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          updatePortalCoords();
        });
      };

      window.addEventListener('resize', handleScrollOrResize, { passive: true });
      window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });

      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, usePortal, isMobile, updatePortalCoords]);

  // Handle click outside and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
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

  // Reset focused index and auto-scroll to selected option when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      const targetIdx = idx >= 0 ? idx : 0;
      setFocusedIndex(targetIdx);
      requestAnimationFrame(() => {
        itemRefs.current[targetIdx]?.scrollIntoView({ block: 'nearest' });
      });
    }
  }, [isOpen, value, options]);

  // Keep focused item in view when navigating via keyboard
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

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

  // Render option list content
  const renderList = (
    <ul
      role="listbox"
      tabIndex={-1}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="max-h-[192px] sm:max-h-[216px] overflow-y-auto overscroll-contain touch-pan-y py-1 sakuku-scrollbar list-none m-0 p-0"
    >
      {options.length === 0 ? (
        <li className="py-3 px-3 text-xs text-center text-gray-400 dark:text-gray-500 list-none">
          Tidak ada pilihan
        </li>
      ) : (
        options.map((option, idx) => {
          const isSelected = option.value === value;
          const isFocused = idx === focusedIndex;

          return (
            <li
              key={String(option.value)}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
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
              className={`flex items-center justify-between min-h-[40px] sm:min-h-[36px] px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors shrink-0 w-full text-left select-none ${
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
            </li>
          );
        })
      )}
    </ul>
  );

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

      {/* MODE B: Inline Mode (usePortal = false, specifically for Transaction History filters) */}
      {isOpen && !usePortal && (
        <div
          ref={menuRef}
          className={`absolute left-0 right-0 z-40 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden animate-in fade-in duration-150 ${
            openUpward ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
          } ${menuClassName}`}
        >
          {renderList}
        </div>
      )}

      {/* MODE A: Portal Mode (usePortal = true, default for all modals and components) */}
      {isOpen && usePortal && mounted && (
        isMobile ? (
          /* Mobile View: Fixed Centered Backdrop Modal */
          createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
              onClick={() => setIsOpen(false)}
            >
              <div
                ref={menuRef}
                className={`w-full max-w-[340px] max-h-[60dvh] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col ${menuClassName}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                  {placeholder || 'Pilih opsi...'}
                </div>
                <div className="overflow-y-auto overscroll-contain flex-1">
                  {renderList}
                </div>
              </div>
            </div>,
            document.body
          )
        ) : (
          /* Desktop & Tablet View: Pixel-Locked Fixed Portal Anchored to Trigger */
          portalCoords &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: portalCoords.top,
                left: portalCoords.left,
                width: portalCoords.width,
                zIndex: 100,
              }}
              className="pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden animate-in fade-in duration-150 ${
                  portalCoords.placement === 'top' ? 'origin-bottom' : 'origin-top'
                } ${menuClassName}`}
              >
                {renderList}
              </div>
            </div>,
            document.body
          )
        )
      )}
    </div>
  );
}

export default CustomSelect;
