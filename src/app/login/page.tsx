'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, Locale } from '@/lib/i18n-context';
import { useTheme } from '@/lib/theme-context';
import { imfexStore } from '@/lib/store';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await imfexStore.loginAsync(email, password);
      if (user) {
        router.replace('/');
      } else {
        setErrorMessage('Грешна е-пошта или лозинка. Ве молиме обидете се повторно.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Настана грешка при најавата. Ве молиме проверете ја вашата интернет врска.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Subtle top-right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-20">
        <button
          type="button"
          onClick={() => setLocale((locale === 'mk' ? 'en' : 'mk') as Locale)}
          className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Промени јазик"
        >
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{locale === 'mk' ? 'МК' : 'EN'}</span>
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Светла тема' : 'Темна тема'}
          aria-label={theme === 'dark' ? 'Светла тема' : 'Темна тема'}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Subtle cobalt top accent wash */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-60 dark:opacity-40"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, hsl(var(--primary) / 0.14) 0%, transparent 100%)',
        }}
      />

      <div className="max-w-sm w-full space-y-6 relative z-10">
        {/* Minimal Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-xs tracking-wider">
            IMFEX
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('login.title')}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Clean Login Surface */}
        <div className="surface-card rounded-2xl p-6 sm:p-7 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-medium text-foreground">{t('login.email')}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@imfex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-foreground">{t('login.password')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Се врши проверка...</span>
                </>
              ) : (
                <>
                  <span>{t('login.submit')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
