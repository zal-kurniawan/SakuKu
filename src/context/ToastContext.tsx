'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
  duration?: number;
  isExiting?: boolean;
}

interface ToastContextType {
  toast: {
    (message: string, variant?: ToastVariant): void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const dismissToast = useCallback((id: string) => {
    // Clear any pending timer
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    // Set exit animation flag
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    // Wait for the exit transition (200ms) before unmounting
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const pauseTimer = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const resumeTimer = useCallback(
    (id: string, duration = 2000) => {
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
      }
      timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    [dismissToast]
  );

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', title?: string, duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, message, variant, title, duration, isExiting: false };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toastMethods = useCallback(
    Object.assign(
      (message: string, variant: ToastVariant = 'info') => {
        addToast(message, variant);
      },
      {
        success: (message: string, title?: string) => addToast(message, 'success', title),
        error: (message: string, title?: string) => addToast(message, 'error', title),
        warning: (message: string, title?: string) => addToast(message, 'warning', title),
        info: (message: string, title?: string) => addToast(message, 'info', title),
      }
    ),
    [addToast]
  );

  // Cleanup on unmount
  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      Object.values(activeTimers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const getVariantStyles = (variant: ToastVariant) => {
    switch (variant) {
      case 'success':
        return {
          card: 'bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-xl border border-emerald-500/35 text-gray-800 dark:text-gray-100 shadow-2xl shadow-black/15 dark:shadow-black/50',
          icon: <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-500 shrink-0" />,
        };
      case 'error':
        return {
          card: 'bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-xl border border-rose-500/35 text-gray-800 dark:text-gray-100 shadow-2xl shadow-black/15 dark:shadow-black/50',
          icon: <AlertCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-rose-500 shrink-0" />,
        };
      case 'warning':
        return {
          card: 'bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-xl border border-amber-500/35 text-gray-800 dark:text-gray-100 shadow-2xl shadow-black/15 dark:shadow-black/50',
          icon: <AlertTriangle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-amber-500 shrink-0" />,
        };
      case 'info':
      default:
        return {
          card: 'bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-xl border border-blue-500/35 text-gray-800 dark:text-gray-100 shadow-2xl shadow-black/15 dark:shadow-black/50',
          icon: <Info className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-500 shrink-0" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, removeToast: dismissToast }}>
      {children}

      {/* Top-Center Toast Container (Centered on all screen sizes, z-[120] priority) */}
      <div
        aria-live="polite"
        className="fixed inset-x-0 top-[max(0.875rem,env(safe-area-inset-top))] sm:top-5 z-[120] flex flex-col items-center gap-2 px-3 sm:px-4 pointer-events-none"
      >
        {toasts.map((item) => {
          const { card, icon } = getVariantStyles(item.variant);
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 w-full max-w-[360px] sm:w-auto sm:min-w-[300px] sm:max-w-[460px] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl ${card} ${
                item.isExiting
                  ? 'opacity-0 -translate-y-2 scale-95 pointer-events-none transition-all duration-200 ease-out'
                  : 'animate-toast-enter transition-all duration-200 ease-out'
              }`}
              role="alert"
              onMouseEnter={() => pauseTimer(item.id)}
              onMouseLeave={() => resumeTimer(item.id)}
            >
              {/* Message Body with Left Icon */}
              <div className={`min-w-0 flex-1 flex gap-2.5 ${item.title ? 'items-start' : 'items-center'}`}>
                <div className={`shrink-0 ${item.title ? 'mt-0.5' : ''}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  {item.title && (
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-0.5 break-words">
                      {item.title}
                    </h4>
                  )}
                  <p className="text-xs sm:text-sm leading-snug font-medium break-words">
                    {item.message}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(item.id);
                }}
                className="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-gray-500 dark:text-gray-400"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          );
        })}
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
