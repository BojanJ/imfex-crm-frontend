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
  X,
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

  const navGroups = [
    {
      label: null,
      items: [
        { label: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
        { label: t('nav.customers'), href: '/customers', icon: Users },
        { label: t('nav.products'), href: '/products', icon: Package },
      ],
    },
    {
      label: null,
      items: [
        { label: t('nav.offers'), href: '/offers', icon: FileSpreadsheet },
        { label: t('nav.projects'), href: '/projects', icon: Briefcase },
        { label: t('nav.finance') || 'Финансии и Набавки', href: '/finance', icon: Landmark },
        { label: t('nav.service') || 'Сервис и Тикети', href: '/service', icon: Wrench },
        { label: t('nav.calendar'), href: '/calendar', icon: Calendar },
      ],
    },
    {
      label: null,
      items: [{ label: t('nav.settings'), href: '/settings', icon: Settings }],
    },
  ];

  const content = (
    <div className="flex flex-col justify-between h-full px-3 py-4">
      <div className="space-y-4">
        {/* Desktop Collapse Toggle */}
        <div className={`hidden lg:flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
          {!isCollapsed && (
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
              {t('nav.navigation')}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={isCollapsed ? t('nav.expand_menu') : t('nav.collapse_menu')}
            aria-label={isCollapsed ? t('nav.expand_menu') : t('nav.collapse_menu')}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Mobile Drawer Header */}
        <div className="lg:hidden flex items-center justify-between px-2 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-md text-xs font-bold tracking-wider">
              IMFEX
            </span>
            <span className="font-semibold text-xs text-foreground">CRM</span>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            aria-label={t('nav.close_menu')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="space-y-3" aria-label={t('nav.main_navigation')}>
          {navGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className={`space-y-0.5 ${gIdx > 0 ? 'pt-3 border-t border-border/60' : ''}`}
            >
              {group.items.map((item) => {
                const normalizedPath = (pathname || '/').replace(/\/+$/, '') || '/';
                const isActive =
                  item.href === '/'
                    ? normalizedPath === '/'
                    : normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onMobileClose?.();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center py-2.5 px-2' : 'gap-2.5 px-3 py-2'
                    } rounded-lg text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isActive
                        ? 'bg-primary/10 text-blue-700 dark:bg-primary/15 dark:text-blue-400 font-semibold'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium'
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-primary' : 'text-muted-foreground/80'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Sign-Out (keeps bottom-left clean of dev indicators) */}
      <div className={`pt-3 border-t border-border/70 ${isCollapsed ? 'pb-14' : ''}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">v1.0 • IMFEX</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md hover:bg-muted transition-colors cursor-pointer shrink-0"
              title={t('nav.sign_out')}
              aria-label={t('nav.sign_out')}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            className="mx-auto text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
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
      {/* Desktop Sticky Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-card/60 transition-all duration-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto shrink-0 ${
          isCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {content}
      </aside>

      {/* Mobile & Tablet Drawer */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.navigation')}
        >
          <div className="w-68 max-w-[82vw] bg-card border-r border-border h-full overflow-y-auto shadow-xl">
            {content}
          </div>
          <div className="flex-1" onClick={onMobileClose} />
        </div>
      )}
    </>
  );
};
