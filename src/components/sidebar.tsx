'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import { UserRole } from '@/types';
import {
  LayoutDashboard,
  Package,
  Users,
  FileSpreadsheet,
  Settings,
  Briefcase,
  Wrench,
  ShieldAlert,
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
  const { t } = useI18n();
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');

  useEffect(() => {
    setRole(imfexStore.getCurrentRole());
  }, []);

  const navItems = [
    {
      label: t('nav.dashboard'),
      href: '/',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'USER'],
    },
    {
      label: t('nav.products'),
      href: '/products',
      icon: Package,
      roles: ['SUPER_ADMIN', 'USER'],
      adminOnlyNotice: true,
    },
    {
      label: t('nav.customers'),
      href: '/customers',
      icon: Users,
      roles: ['SUPER_ADMIN', 'USER'],
    },
    {
      label: t('nav.offers'),
      href: '/offers',
      icon: FileSpreadsheet,
      roles: ['SUPER_ADMIN', 'USER'],
    },
    {
      label: t('nav.projects'),
      href: '/projects',
      icon: Briefcase,
      roles: ['SUPER_ADMIN', 'USER'],
    },
    {
      label: t('nav.service'),
      href: '/service',
      icon: Wrench,
      roles: ['SUPER_ADMIN', 'USER'],
    },
    {
      label: t('nav.settings'),
      href: '/settings',
      icon: Settings,
      roles: ['SUPER_ADMIN'],
    },
  ];

  const content = (
    <div className="flex flex-col justify-between h-full p-4 space-y-6">
      <div className="space-y-4">
        {/* Header / Collapse Toggle on Desktop */}
        <div className="hidden md:flex items-center justify-between px-2">
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Main Navigation
            </p>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all ml-auto"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Header Title */}
        <div className="md:hidden flex items-center justify-between pb-2 border-b border-border">
          <span className="font-extrabold text-sm text-primary">IMFEX Navigation</span>
          <button onClick={onMobileClose} className="text-muted-foreground hover:text-foreground font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const isSuperAdminOnly = item.roles.length === 1 && item.roles[0] === 'SUPER_ADMIN';

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

                {!isCollapsed && item.adminOnlyNotice && role === 'USER' && (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    READ
                  </span>
                )}

                {!isCollapsed && isSuperAdminOnly && (
                  <span className="text-[9px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                    ADMIN
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role Access Indicator Card */}
      {!isCollapsed && (
        <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
            <span>Role Permissions</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {role === 'SUPER_ADMIN'
              ? 'Full CRUD privileges across Sales, Operations, Service & Products.'
              : 'Agent access for Quotes, Operational Projects, Service & Customers.'}
          </p>
        </div>
      )}

      {/* Footer Status */}
      <div className={`pt-4 border-t border-border text-[11px] text-muted-foreground ${isCollapsed ? 'text-center' : 'flex items-center justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">IMFEX CRM v1.0</span>
            </div>
            <Link href="/login" className="text-muted-foreground hover:text-red-500 p-1" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </Link>
          </>
        ) : (
          <span className="w-2.5 h-2.5 mx-auto rounded-full bg-emerald-500 animate-pulse block" />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 min-h-[calc(100vh-4rem)] ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
          <div className="w-72 bg-card border-r border-border h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
          <div className="flex-1" onClick={onMobileClose} />
        </div>
      )}
    </>
  );
};
