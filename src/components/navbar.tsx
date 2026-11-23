'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n, Locale } from '@/lib/i18n-context';
import { useTheme } from '@/lib/theme-context';
import { imfexStore, useImfexStore } from '@/lib/store';
import { getUserRoleLabel } from '@/lib/enum-labels';
import { UserProfile } from '@/types';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { locale, setLocale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const storeVersion = useImfexStore();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setCurrentUser(imfexStore.getCurrentUser());
  }, [storeVersion]);

  const handleSignOut = () => {
    imfexStore.logout();
    window.location.href = '/login';
  };

  const isDark = theme === 'dark';

  return (
    <header className="h-14 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile & Tablet Hamburger Toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg border border-border lg:hidden text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={t('nav.open_navigation')}
          aria-label={t('nav.open_navigation')}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-md text-xs font-bold tracking-wider">
            IMFEX
          </span>
          <span className="hidden sm:inline text-foreground/90 text-xs font-semibold tracking-tight truncate group-hover:text-foreground transition-colors">
            {t('app_title')}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-lg border border-border bg-background/70 hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors cursor-pointer"
          title={isDark ? t('nav.light_theme') : t('nav.dark_theme')}
          aria-label={isDark ? t('nav.light_theme') : t('nav.dark_theme')}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Language Switcher (MK / EN segmented toggle — no search box for 2 options) */}
        <div
          className="inline-flex items-center h-8 p-0.5 border border-border rounded-lg bg-background/70 text-[11px] font-semibold"
          role="group"
          aria-label={t('nav.language_switcher')}
        >
          {(['mk', 'en'] as Locale[]).map((code) => {
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                aria-pressed={active}
                className={`h-7 px-2 rounded-md transition-colors cursor-pointer ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {code === 'mk' ? 'МК' : 'EN'}
              </button>
            );
          })}
        </div>

        {/* User Profile & Sign-out */}
        <div className="flex items-center gap-2.5 pl-2.5 ml-0.5 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-[11px] text-primary uppercase shrink-0">
            {currentUser?.fullName ? currentUser.fullName.slice(0, 2) : 'IM'}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-foreground max-w-[140px] truncate">
                {currentUser?.fullName || ''}
              </p>
              {currentUser?.role && (
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold whitespace-nowrap">
                  {getUserRoleLabel(currentUser.role, locale)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-[180px] truncate">
              {currentUser?.email || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-muted rounded-lg transition-colors cursor-pointer"
            title={t('nav.sign_out')}
            aria-label={t('nav.sign_out')}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
