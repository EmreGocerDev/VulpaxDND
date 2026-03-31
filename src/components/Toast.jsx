import React from 'react';
import { useToastStore } from '../stores/toastStore';

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  info: '📜',
  warning: '⚠️',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type} anim-slide`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast__icon">{TOAST_ICONS[toast.type]}</span>
          <span className="toast__message">{toast.message}</span>
          <button className="toast__close" onClick={() => removeToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
