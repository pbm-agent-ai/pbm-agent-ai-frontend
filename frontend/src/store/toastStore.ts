import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms, 0 = sticky
}

interface ToastState {
  toasts: ToastItem[];
  _add: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  _add: (type, message, duration = 3000) => {
    const id = `toast-${nextId++}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  clear: () => set({ toasts: [] }),
}));

/** 간편 토스트 API */
export const toast = {
  success: (message: string) => useToastStore.getState()._add('success', message, 2500),
  error: (message: string, duration = 4000) => useToastStore.getState()._add('error', message, duration),
  warning: (message: string, duration = 3500) => useToastStore.getState()._add('warning', message, duration),
  info: (message: string, duration = 3000) => useToastStore.getState()._add('info', message, duration),
};
