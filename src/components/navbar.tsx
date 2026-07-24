'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n, Locale } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import { UserRole } from '@/types';
import {
  Globe,
  Shield,
  UserCheck,
  Menu,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const { locale, setLocale, t } = useI18n();
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');

  useEffect(() => {
    setRole(imfexStore.getCurrentRole());
  }, []);

  const handleRoleToggle = (newRole: UserRole) => {
    setRole(newRole);
    imfexStore.setCurrentRole(newRole);
    window.location.reload();
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 border border-border rounded-xl md:hidden text-foreground hover:bg-muted transition-colors"
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

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Toggle Switcher */}
        <div className="hidden sm:flex items-center bg-muted p-1 rounded-xl border border-border">
          <button
            onClick={() => handleRoleToggle('SUPER_ADMIN')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              role === 'SUPER_ADMIN'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {t('nav.super_admin')}
          </button>
          <button
            onClick={() => handleRoleToggle('USER')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              role === 'USER'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {t('nav.user')}
          </button>
        </div>

        {/* Language Switcher (EN & MK) */}
        <div className="flex items-center border border-border rounded-lg bg-card px-2 py-1 gap-1 text-xs font-medium">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="bg-transparent text-foreground outline-none cursor-pointer font-bold"
          >
            <option value="en">EN</option>
            <option value="mk">MK (МК)</option>
          </select>
        </div>

        {/* User Profile & Sign-in Link */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
            {role === 'SUPER_ADMIN' ? 'SA' : 'AG'}
          </div>
          <div className="hidden lg:block text-left text-xs">
            <p className="font-semibold leading-none">{role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sales Representative'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{role === 'SUPER_ADMIN' ? 'admin@imfex.com' : 'sales@imfex.com'}</p>
          </div>
          <Link
            href="/login"
            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted rounded-lg transition-colors"
            title="Sign In / Switch Account"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
};
