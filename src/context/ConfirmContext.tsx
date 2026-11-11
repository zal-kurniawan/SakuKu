'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, Loader2 } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: 'trash' | 'alert' | 'info';
  onConfirm?: () => Promise<void> | void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  setConfirmLoading: (loading: boolean) => void;
}

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: async () => false,
  setConfirmLoading: () => {},
});

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsLoading(false);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = async () => {
    if (isLoading) return;

    if (options?.onConfirm) {
      try {
        setIsLoading(true);
        await options.onConfirm();
        setIsOpen(false);
        if (resolverRef.current) {
          resolverRef.current(true);
          resolverRef.current = null;
        }
      } catch (err) {
        console.error('Confirm action error:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsOpen(false);
      if (resolverRef.current) {
        resolverRef.current(true);
        resolverRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  // Keyboard accessibility: ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading]);

  // Auto focus confirm button when opened
  useEffect(() => {
    if (isOpen && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [isOpen]);

  const variant = options?.variant || 'danger';
  const iconType = options?.icon || (variant === 'danger' ? 'trash' : 'alert');

  // Explicit solid color fallbacks for guaranteed button visibility & high contrast
  const confirmBgColor =
    variant === 'danger' ? '#dc2626' : variant === 'warning' ? '#d97706' : '#2563eb';

  return (
    <ConfirmContext.Provider value={{ confirm, setConfirmLoading: setIsLoading }}>
      {children}

      {isOpen && options && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              handleCancel();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-[94vw] max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150 text-gray-900 dark:text-gray-100"
          >
            {/* Header & Icon */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  variant === 'danger'
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                    : variant === 'warning'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                }`}
              >
                {iconType === 'trash' ? (
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400" />
                ) : iconType === 'alert' ? (
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug break-words">
                  {options.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                  {options.message}
                </p>
              </div>
            </div>

            {/* Action Buttons: Responsive Column-Reverse on Mobile, Row on Desktop */}
            <div className="pt-2 sm:pt-3 flex flex-col-reverse xs:flex-row items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full xs:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 active:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-200 dark:active:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px] flex items-center justify-center cursor-pointer"
              >
                {options.cancelText || 'Batal'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                style={{
                  backgroundColor: confirmBgColor,
                  color: '#ffffff',
                }}
                className={`w-full xs:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px] cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-600/30 border border-red-500'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/30 border border-amber-500'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/30 border border-blue-500'
                }`}
              >
                {isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-white flex-shrink-0" />
                )}
                <span className="text-white font-bold tracking-wide select-none" style={{ color: '#ffffff' }}>
                  {options.confirmText || 'Konfirmasi'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const useConfirmState = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmState must be used within a ConfirmProvider');
  }
  return context;
};
