'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';
import { useEscapeKey } from './use-escape-key';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Потврди',
  cancelLabel = 'Откажи',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  useEscapeKey(isOpen, onCancel);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const iconBg = isDanger
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    : isWarning
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : isSuccess
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    : 'bg-primary/10 text-primary border-primary/20';

  const btnClass = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : isSuccess
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : 'bg-primary hover:bg-primary/90 text-primary-foreground';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${iconBg}`}>
              {isDanger ? (
                <Trash2 className="w-4 h-4" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground leading-snug">
                {title}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Потврда на акција
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Затвори"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 border border-border/70 rounded-xl p-3.5">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted font-medium text-foreground cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${btnClass}`}
          >
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
