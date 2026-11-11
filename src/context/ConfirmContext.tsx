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

  return (
    <ConfirmContext.Provider value={{ confirm, setConfirmLoading: setIsLoading }}>
      {children}

      {isOpen && options && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              handleCancel();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header & Icon */}
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                  variant === 'danger'
                    ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20'
                    : variant === 'warning'
                    ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'
                    : 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20'
                }`}
              >
                {iconType === 'trash' ? (
                  <Trash2 className="w-5 h-5 text-red-500" />
                ) : iconType === 'alert' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                  {options.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
              >
                {options.cancelText || 'Batal'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] ${
                  variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{options.confirmText || 'Konfirmasi'}</span>
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
