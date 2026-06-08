import { create } from 'zustand';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: 'question' | 'warning';
}

interface ConfirmDialogState {
  visible: boolean;
  options: ConfirmDialogOptions | null;
  resolve: ((value: boolean) => void) | null;
  _show: (opts: ConfirmDialogOptions) => Promise<boolean>;
  _hide: () => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set) => ({
  visible: false,
  options: null,
  resolve: null,

  _show: (opts) => {
    return new Promise<boolean>((resolve) => {
      set({ visible: true, options: opts, resolve });
    });
  },

  _hide: () => {
    set({ visible: false, options: null, resolve: null });
  },
}));

/** Promise 기반 확인 다이얼로그 API */
export const confirmDialog = {
  show: (opts: ConfirmDialogOptions): Promise<boolean> => {
    return useConfirmDialogStore.getState()._show(opts);
  },
};
