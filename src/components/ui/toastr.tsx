'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let globalAddToast: ((type: ToastType, title: string, message?: string, duration?: number) => void) | null = null;

export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    globalAddToast?.('success', title, message, duration),
  error: (title: string, message?: string, duration?: number) =>
    globalAddToast?.('error', title, message, duration),
  info: (title: string, message?: string, duration?: number) =>
    globalAddToast?.('info', title, message, duration),
  warning: (title: string, message?: string, duration?: number) =>
    globalAddToast?.('warning', title, message, duration),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  globalAddToast = addToast;

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in-50 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-50 shadow-emerald-950/20'
                  : isError
                  ? 'bg-slate-900/95 border-red-500/50 text-red-50 shadow-red-950/20'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/50 text-amber-50 shadow-amber-950/20'
                  : 'bg-slate-900/95 border-blue-500/50 text-blue-50 shadow-blue-950/20'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <XCircle className="w-5 h-5 text-red-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black tracking-wide uppercase leading-snug">{t.title}</h4>
                {t.message && <p className="text-xs opacity-90 mt-0.5 font-medium leading-relaxed">{t.message}</p>}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 opacity-70 hover:opacity-100 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: () => {},
      removeToast: () => {},
      toast,
    };
  }
  return ctx;
};
