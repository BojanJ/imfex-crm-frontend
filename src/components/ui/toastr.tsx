'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      timersRef.current.set(id, timer);
    },
    []
  );

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      if (globalAddToast === addToast) {
        globalAddToast = null;
      }
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          const accentBorder = isSuccess
            ? 'border-emerald-500/35'
            : isError
            ? 'border-rose-500/35'
            : isWarning
            ? 'border-amber-500/35'
            : 'border-primary/35';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border bg-card/95 backdrop-blur-md text-foreground shadow-lg transition-all duration-200 ${accentBorder}`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isError && <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                {t.type === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold leading-snug text-foreground">{t.title}</h4>
                {t.message && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.message}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                aria-label="Затвори известување"
              >
                <X className="w-3.5 h-3.5" />
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
