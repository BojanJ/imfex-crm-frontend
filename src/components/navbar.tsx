'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n, Locale } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import { UserProfile } from '@/types';
import {
  Globe,
  Menu,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { locale, setLocale, t } = useI18n();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setCurrentUser(imfexStore.getCurrentUser());
  }, []);

  const handleSignOut = () => {
    imfexStore.logout();
    window.location.href = '/login';
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 border border-border rounded-xl md:hidden text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Open Mobile Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo */}
        <Link href="/" className="font-extrabold text-xl tracking-tight text-primary flex items-center gap-2">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-lg text-sm font-black shadow-sm">
            IMFEX
          </span>
          <span className="hidden sm:inline text-foreground text-sm font-semibold">
            {t('app_title')}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language Switcher (EN & MK) */}
        <div className="flex items-center border border-border rounded-lg bg-card px-2.5 py-1 gap-1 text-xs font-medium">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="bg-transparent text-foreground outline-none cursor-pointer font-bold"
          >
            <option value="mk">MK (МК)</option>
            <option value="en">EN</option>
          </select>
        </div>

        {/* User Profile & Sign-out */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary uppercase">
            {currentUser?.fullName ? currentUser.fullName.slice(0, 2) : 'SA'}
          </div>
          <div className="hidden lg:block text-left text-xs">
            <p className="font-semibold leading-none text-foreground">{currentUser?.fullName || 'Супер Администратор'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{currentUser?.email || 'admin@imfex.com'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted rounded-lg transition-colors cursor-pointer"
            title={t('nav.sign_out')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
