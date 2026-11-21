'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n-context';
import { Lock, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const token = searchParams?.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage(
        locale === 'mk'
          ? 'Невалиден или недостасувачки токен за ресетирање.'
          : 'Invalid or missing password reset token.'
      );
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(
        locale === 'mk'
          ? 'Новата лозинка мора да содржи најмалку 8 карактери.'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(locale === 'mk' ? 'Лозинките не се совпаѓаат.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Грешка при ресетирање на лозинката.');
        setIsSubmitting(false);
        return;
      }
      setIsDone(true);
    } catch {
      setErrorMessage('Мрежна грешка. Обидете се повторно.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="max-w-md w-full space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3.5 py-1 rounded-full text-primary font-black text-xs">
            <Sparkles className="w-4 h-4 text-amber-500" /> IMFEX Enterprise
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {locale === 'mk' ? 'Поставете нова лозинка' : 'Set a New Password'}
          </h1>
        </div>

        <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-xs">
          {isDone ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <span>
                  {locale === 'mk'
                    ? 'Вашата лозинка е успешно ресетирана! Сега можете да се најавите.'
                    : 'Your password has been reset successfully! You can now sign in.'}
                </span>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-extrabold hover:bg-primary/90 shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                {locale === 'mk' ? 'Оди на најава' : 'Go to Sign In'}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1.5 text-foreground">
                  {locale === 'mk' ? 'Нова лозинка (мин. 8 знаци)' : 'New Password (min 8 chars)'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-foreground">
                  {locale === 'mk' ? 'Потврди нова лозинка' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background font-medium outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-extrabold hover:bg-primary/90 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{locale === 'mk' ? 'Се зачувува...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>{locale === 'mk' ? 'Зачувај нова лозинка' : 'Save New Password'}</span>
                )}
              </button>

              <Link
                href="/login"
                className="block text-center text-xs font-bold text-primary hover:underline pt-1"
              >
                ← {locale === 'mk' ? 'Назад кон најава' : 'Back to Sign In'}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
