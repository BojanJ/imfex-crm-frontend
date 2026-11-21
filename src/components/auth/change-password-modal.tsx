'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { imfexStore } from '@/lib/store';
import { toast } from '@/components/ui/toastr';
import { ShieldAlert, Lock, Eye, EyeOff, Loader2, LogOut, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  forced?: boolean;
  onClose?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  forced = false,
  onClose,
}) => {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword.trim()) {
      setErrorMessage('Внесете ја тековната (привремена) лозинка.');
      return;
    }
    if (newPassword.trim().length < 8) {
      setErrorMessage('Новата лозинка мора да содржи најмалку 8 карактери.');
      return;
    }
    if (newPassword.trim() === currentPassword.trim()) {
      setErrorMessage('Новата лозинка мора да се разликува од тековната.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Лозинките не се совпаѓаат.');
      return;
    }

    setIsSubmitting(true);
    const result = await imfexStore.changePasswordAsync(currentPassword.trim(), newPassword.trim());
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error || 'Грешка при промена на лозинката.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Лозинката е успешно променета!', 'Вашата сметка е целосно активна.');
    onClose?.();
  };

  const handleSignOut = () => {
    imfexStore.logout();
    router.replace('/login');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Задолжителна промена на лозинка"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-foreground">
              {forced ? 'Задолжителна промена на лозинка' : 'Промена на лозинка'}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {forced
                ? 'За ваша безбедност, мора да ја промените привремената лозинка пред да продолжите со работа.'
                : 'Внесете ја тековната и новата лозинка (минимум 8 карактери).'}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block font-semibold mb-1 text-foreground">
              Тековна (привремена) лозинка
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? 'Сокриј лозинки' : 'Прикажи лозинки'}
                className="absolute right-2.5 top-2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-foreground">
              Нова лозинка (мин. 8 карактери)
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Најмалку 8 карактери"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-foreground">
              Потврди нова лозинка
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторете ја новата лозинка"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {forced ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Одјави се
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border font-semibold hover:bg-muted cursor-pointer"
              >
                Откажи
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold hover:bg-primary/90 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Се зачувува...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Зачувај нова лозинка
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
