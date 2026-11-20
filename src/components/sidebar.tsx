'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import {
  LayoutDashboard,
  Package,
  Users,
  FileSpreadsheet,
  Settings,
  Briefcase,
  Landmark,
  Wrench,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const handleSignOut = () => {
    imfexStore.logout();
    onMobileClose?.();
    router.replace('/login');
  };

  const navItems = [
    {
      label: t('nav.dashboard'),
      href: '/',
      icon: LayoutDashboard,
    },
    {
      label: t('nav.products'),
      href: '/products',
      icon: Package,
    },
    {
      label: t('nav.customers'),
      href: '/customers',
      icon: Users,
    },
    {
      label: t('nav.offers'),
      href: '/offers',
      icon: FileSpreadsheet,
    },
    {
      label: t('nav.projects'),
      href: '/projects',
      icon: Briefcase,
    },
    {
      label: t('nav.finance') || 'Финансии и Набавки',
      href: '/finance',
      icon: Landmark,
    },
    {
      label: t('nav.service') || 'Сервис и Тикети',
      href: '/service',
      icon: Wrench,
    },
    {
      label: t('nav.calendar'),
      href: '/calendar',
      icon: Calendar,
    },
    {
      label: t('nav.settings'),
      href: '/settings',
      icon: Settings,
    },
  ];

  const content = (
    <div className="flex flex-col justify-between h-full p-4 space-y-6">
      <div className="space-y-4">
        {/* Header / Collapse Toggle on Desktop */}
        <div className="hidden lg:flex items-center justify-between px-2">
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t('nav.dashboard')}
            </p>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all ml-auto cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile / Tablet Header Title */}
        <div className="lg:hidden flex items-center justify-between pb-2 border-b border-border">
          <span className="font-extrabold text-sm text-primary">IMFEX Navigation</span>
          <button
            type="button"
            onClick={onMobileClose}
            className="text-muted-foreground hover:text-foreground font-bold text-sm p-1 rounded-lg hover:bg-muted cursor-pointer"
            aria-label="Затвори мени"
          >
            ✕
          </button>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center ${
                  isCollapsed ? 'justify-center py-3' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      <div className={`pt-4 pb-6 lg:pb-2 border-t border-border text-[11px] text-muted-foreground ${isCollapsed ? 'text-center' : 'flex items-center justify-between gap-2'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-medium truncate">IMFEX Enterprise v1.0</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer shrink-0"
              title={t('nav.sign_out')}
              aria-label={t('nav.sign_out')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="mx-auto text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-muted cursor-pointer block"
            title={t('nav.sign_out')}
            aria-label={t('nav.sign_out')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sticky Sidebar (auto-collapses into drawer below lg/1024px) */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile & Tablet Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex"
          role="dialog"
          aria-modal="true"
          aria-label="Навигација"
        >
          <div className="w-72 bg-card border-r border-border h-full overflow-y-auto shadow-2xl">
            {content}
          </div>
          <div className="flex-1" onClick={onMobileClose} />
        </div>
      )}
    </>
  );
};
