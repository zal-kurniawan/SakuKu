'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: {
    (message: string, variant?: ToastVariant): void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', title?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, message, variant, title, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastMethods = useCallback(
    Object.assign(
      (message: string, variant: ToastVariant = 'info') => {
        addToast(message, variant);
      },
      {
        success: (message: string, title?: string) => addToast(message, 'success', title),
        error: (message: string, title?: string) => addToast(message, 'error', title),
        info: (message: string, title?: string) => addToast(message, 'info', title),
      }
    ),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: toastMethods, removeToast }}>
      {children}

      {/* Floating Responsive Toast Container (Full-width on mobile top, floating top-right on tablet/desktop) */}
      <div
        aria-live="polite"
        className="fixed top-3 inset-x-3 sm:top-5 sm:right-5 sm:left-auto sm:max-w-sm sm:w-full z-[99999] flex flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-2 sm:slide-in-from-right-4 fade-in ${
              item.variant === 'success'
                ? 'bg-white/95 dark:bg-gray-900/95 border-emerald-500/30 text-gray-900 dark:text-white shadow-emerald-500/10'
                : item.variant === 'error'
                ? 'bg-white/95 dark:bg-gray-900/95 border-rose-500/30 text-gray-900 dark:text-white shadow-rose-500/10'
                : 'bg-white/95 dark:bg-gray-900/95 border-blue-500/30 text-gray-900 dark:text-white shadow-blue-500/10'
            }`}
            role="alert"
          >
            {/* Variant Icon Badge */}
            <div
              className={`p-1.5 sm:p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                item.variant === 'success'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                  : item.variant === 'error'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400'
              }`}
            >
              {item.variant === 'success' && (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              )}
              {item.variant === 'error' && (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
              )}
              {item.variant === 'info' && <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              {item.title && (
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight mb-0.5 break-words">
                  {item.title}
                </h4>
              )}
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug break-words">
                {item.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};
