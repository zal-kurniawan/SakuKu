'use client';

import { useEffect, useRef } from 'react';

interface ModalEscapeEntry {
  id: string;
  onClose: () => void;
  disabled: boolean;
  priority: number;
}

// Module-scoped stack of currently active modals
const activeModals: ModalEscapeEntry[] = [];
let isGlobalListenerAttached = false;

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (activeModals.length === 0) return;

  // Prevent default and stop immediate propagation so that lower priority / underlying listeners don't also fire
  e.stopImmediatePropagation();
  e.preventDefault();

  // Find the topmost modal:
  // Sort descending by priority; if priorities are equal, latest opened (last in array) comes first.
  const sorted = [...activeModals].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return activeModals.indexOf(b) - activeModals.indexOf(a);
  });

  const topModal = sorted[0];
  if (topModal && !topModal.disabled) {
    topModal.onClose();
  }
};

const ensureGlobalListener = () => {
  if (typeof window === 'undefined') return;
  if (!isGlobalListenerAttached) {
    window.addEventListener('keydown', handleGlobalKeyDown, true); // capture phase
    isGlobalListenerAttached = true;
  }
};

export interface UseModalEscapeOptions {
  isOpen: boolean;
  onClose: () => void;
  disabled?: boolean;
  priority?: number;
}

export function useModalEscape({
  isOpen,
  onClose,
  disabled = false,
  priority = 0,
}: UseModalEscapeOptions) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const priorityRef = useRef(priority);
  priorityRef.current = priority;

  useEffect(() => {
    ensureGlobalListener();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const id = Math.random().toString(36).substring(2, 9);

    const entry: ModalEscapeEntry = {
      id,
      get onClose() {
        return onCloseRef.current;
      },
      get disabled() {
        return disabledRef.current;
      },
      get priority() {
        return priorityRef.current;
      },
    };

    activeModals.push(entry);

    return () => {
      const idx = activeModals.findIndex((m) => m.id === id);
      if (idx !== -1) {
        activeModals.splice(idx, 1);
      }
    };
  }, [isOpen]);
}
