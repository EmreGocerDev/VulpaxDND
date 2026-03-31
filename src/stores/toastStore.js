import { create } from 'zustand';

let toastId = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    set((s) => ({
      toasts: [...s.toasts, { id, message, type }],
    }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
  },

  removeToast: (id) => {
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  },

  success: (msg) => get().addToast(msg, 'success'),
  error: (msg) => get().addToast(msg, 'error', 6000),
  info: (msg) => get().addToast(msg, 'info'),
  warning: (msg) => get().addToast(msg, 'warning', 5000),
}));
