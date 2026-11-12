'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';

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
  confirmLabel = 'Да, Потврди',
  cancelLabel = 'Откажи',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const iconBg = isDanger
    ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
    : isWarning
    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
    : isSuccess
    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
    : 'bg-primary/15 text-primary border-primary/30';

  const btnClass = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 text-white'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : isSuccess
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : 'bg-primary hover:bg-primary/90 text-primary-foreground';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${iconBg}`}>
              {isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-foreground leading-snug">
                {title}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Потврда на акција во IMFEX CRM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-foreground font-medium leading-relaxed">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted font-bold text-foreground cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-1.5 ${btnClass}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
