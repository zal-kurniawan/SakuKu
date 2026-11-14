'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

export interface CustomColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
  trigger?: React.ReactNode;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

export const PRESET_COLORS = [
  '#005CAA',
  '#F97316',
  '#EF4444',
  '#06B6D4',
  '#10B981',
  '#22C55E',
  '#8B5CF6',
  '#EC4899',
];

// Helper: check if string is a valid 3- or 6-digit hex
export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

// Helper: normalize to 6-digit uppercase #RRGGBB
export function normalizeHex(hex: string): string {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return '#' + clean.toUpperCase();
}

// Helper: Hex -> RGB (0-255)
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex).replace(/^#/, '');
  const num = parseInt(norm, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper: RGB -> Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Helper: RGB -> HSV (h: 0-360, s: 0-1, v: 0-1)
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = h * 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

// Helper: HSV -> RGB
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (hPrime >= 2 && hPrime < 3) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export const CustomColorPicker: React.FC<CustomColorPickerProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  trigger,
  id,
  name,
  'aria-label': ariaLabel,
}) => {
  const { t } = useTranslation();
  const autoId = useId();
  const pickerId = id || autoId;

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const initialColorRef = useRef<string>(isValidHex(value) ? normalizeHex(value) : '#005CAA');

  // Internal color state
  const [currentColor, setCurrentColor] = useState<string>(() =>
    isValidHex(value) ? normalizeHex(value) : '#005CAA'
  );
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() =>
    hexToHsv(isValidHex(value) ? normalizeHex(value) : '#005CAA')
  );
  const [hexInput, setHexInput] = useState<string>(() =>
    (isValidHex(value) ? normalizeHex(value) : '#005CAA').replace('#', '')
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const isDraggingSatVal = useRef(false);
  const isDraggingHue = useRef(false);

  // Client-side mount check for createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync when value prop changes from outside
  useEffect(() => {
    if (value && isValidHex(value)) {
      const norm = normalizeHex(value);
      setCurrentColor(norm);
      setHsv(hexToHsv(norm));
      setHexInput(norm.replace('#', ''));
    }
  }, [value]);

  // Handle open state: capture initial color for Cancel
  const handleOpen = () => {
    if (disabled) return;
    const current = isValidHex(value) ? normalizeHex(value) : '#005CAA';
    initialColorRef.current = current;
    setCurrentColor(current);
    setHsv(hexToHsv(current));
    setHexInput(current.replace('#', ''));
    setIsOpen(true);
  };

  // Close & Cancel: revert color
  const handleCancel = () => {
    onChange(initialColorRef.current);
    setIsOpen(false);
  };

  // Close & Apply: confirm current color
  const handleApply = () => {
    onChange(currentColor);
    setIsOpen(false);
  };

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentColor]);

  // Update Saturation & Value from 2D square pointer position
  const updateSatVal = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const newS = x;
      const newV = 1 - y;

      setHsv((prev) => {
        const nextHsv = { ...prev, s: newS, v: newV };
        const newHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
        setCurrentColor(newHex);
        setHexInput(newHex.replace('#', ''));
        onChange(newHex);
        return nextHsv;
      });
    },
    [onChange]
  );

  const handleSatValDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingSatVal.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSatVal(e);
  };

  const handleSatValMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSatVal.current) {
      updateSatVal(e);
    }
  };

  const handleSatValUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSatVal.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Update Hue from slider pointer position
  const updateHue = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newH = Math.round(x * 360) % 360;

      setHsv((prev) => {
        const nextHsv = { ...prev, h: newH };
        const newHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
        setCurrentColor(newHex);
        setHexInput(newHex.replace('#', ''));
        onChange(newHex);
        return nextHsv;
      });
    },
    [onChange]
  );

  const handleHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingHue.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateHue(e);
  };

  const handleHueMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingHue.current) {
      updateHue(e);
    }
  };

  const handleHueUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingHue.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Select quick preset color
  const handleSelectPreset = (presetHex: string) => {
    const norm = normalizeHex(presetHex);
    setCurrentColor(norm);
    setHsv(hexToHsv(norm));
    setHexInput(norm.replace('#', ''));
    onChange(norm);
  };

  // Handle manual typing in HEX input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    setHexInput(raw);

    if (raw.length === 6 || raw.length === 3) {
      const norm = normalizeHex(raw);
      setCurrentColor(norm);
      setHsv(hexToHsv(norm));
      onChange(norm);
    }
  };

  const handleHexInputBlur = () => {
    if (isValidHex(hexInput)) {
      const norm = normalizeHex(hexInput);
      setHexInput(norm.replace('#', ''));
      setCurrentColor(norm);
    } else {
      setHexInput(currentColor.replace('#', ''));
    }
  };

  // Pure color for 2D square background at current Hue
  const pureHueColor = `hsl(${hsv.h}, 100%, 50%)`;

  // Color Picker Card Content
  const pickerCardContent = (
    <div
      className="space-y-3.5 select-none text-gray-900 dark:text-gray-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title & Close button */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
          {t('wallets.colorPickerTitle') || 'Pilih Warna Identitas'}
        </h4>
        <button
          type="button"
          onClick={handleCancel}
          className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          aria-label={t('common.close') || 'Tutup'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. 2D Saturation & Brightness Square */}
      <div
        ref={satValRef}
        onPointerDown={handleSatValDown}
        onPointerMove={handleSatValMove}
        onPointerUp={handleSatValUp}
        className="w-full h-36 sm:h-40 rounded-xl relative cursor-crosshair select-none touch-none border border-gray-200/80 dark:border-gray-700/80 overflow-hidden shadow-inner"
        style={{ backgroundColor: pureHueColor }}
      >
        {/* Saturation gradient: white to transparent horizontally */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        {/* Brightness gradient: transparent to black vertically */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />

        {/* 2D Indicator thumb */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-1 ring-black/25"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: currentColor,
          }}
        />
      </div>

      {/* 2. Hue Spectrum Slider */}
      <div className="space-y-1">
        <div
          ref={hueRef}
          onPointerDown={handleHueDown}
          onPointerMove={handleHueMove}
          onPointerUp={handleHueUp}
          className="w-full h-3.5 rounded-full relative cursor-pointer select-none touch-none shadow-inner border border-gray-200/60 dark:border-gray-700/60"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        >
          {/* Hue slider thumb */}
          <div
            className="absolute w-4 h-4 rounded-full bg-white border-2 border-gray-900/30 shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              top: '50%',
            }}
          />
        </div>
      </div>

      {/* 3. Quick Swatches */}
      <div className="space-y-1 pt-0.5">
        <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('wallets.colorPickerPresets') || 'Warna Preset'}
        </div>
        <div className="flex items-center justify-between gap-1">
          {PRESET_COLORS.map((c) => {
            const isMatch = currentColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleSelectPreset(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer border border-white/20 ${
                  isMatch
                    ? 'scale-110 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 shadow-sm'
                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                }`}
                title={c}
                aria-label={`Select color ${c}`}
              />
            );
          })}
        </div>
      </div>

      {/* 4. Live Preview Box & Synchronized Hex Input */}
      <div className="flex items-center gap-2 pt-1">
        <div
          className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0 shadow-inner transition-colors"
          style={{ backgroundColor: currentColor }}
          title={currentColor}
        />
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-gray-400">
            #
          </span>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            onBlur={handleHexInputBlur}
            maxLength={6}
            placeholder="005CAA"
            aria-label="Hex color code"
            className="w-full bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs sm:text-sm font-mono text-gray-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 5. Bottom Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={handleCancel}
          className="h-9 px-4 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
        >
          {t('wallets.colorPickerCancel') || 'Batal'}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="h-9 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer active:scale-95"
        >
          {t('wallets.colorPickerApply') || 'Terapkan'}
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Hidden input for form accessibility */}
      {name && <input type="hidden" name={name} value={currentColor} />}

      {/* Trigger Button or Custom Trigger */}
      <div ref={triggerRef} onClick={handleOpen} className="inline-block">
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            id={pickerId}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={ariaLabel || t('wallets.customColor') || 'Pilih palet warna bebas'}
            className="w-9 h-9 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer flex items-center justify-center hover:ring-2 hover:ring-blue-500/40 transition-all shadow-xs shrink-0"
            title={t('wallets.customColor') || 'Pilih palet warna bebas'}
          >
            <span
              className="w-full h-full rounded-md shadow-inner transition-colors"
              style={{ backgroundColor: currentColor }}
            />
          </button>
        )}
      </div>

      {/* Centered Modal with Backdrop Blur mounted directly into document.body via Portal */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={handleApply}
          >
            <div
              className="w-full max-w-[320px] sm:max-w-[340px] rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xl p-4 sm:p-5 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {pickerCardContent}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomColorPicker;
