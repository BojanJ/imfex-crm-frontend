'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                 PageHeader                                 */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  backHref,
  onBack,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-5 border-b border-border/80 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mt-0.5 p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 cursor-pointer"
            aria-label="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : icon ? (
          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  StatCard                                  */
/* -------------------------------------------------------------------------- */

export type StatTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  badge?: React.ReactNode;
  className?: string;
}

const TONE_ICON_STYLES: Record<StatTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  helper,
  icon,
  tone = 'neutral',
  badge,
  className = '',
}) => {
  return (
    <div
      className={`surface-card rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-2.5 transition-colors hover:border-border/90 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {label}
        </span>
        {icon && (
          <div className={`p-1.5 rounded-lg shrink-0 ${TONE_ICON_STYLES[tone]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        {badge}
      </div>

      {helper && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {helper}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 StatusBadge                                */
/* -------------------------------------------------------------------------- */

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  neutral: 'bg-muted text-muted-foreground border-border/70',
  primary: 'bg-primary/10 text-blue-700 dark:text-blue-400 border-primary/20',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  neutral: 'bg-muted-foreground/70',
  primary: 'bg-blue-600 dark:bg-blue-400',
  success: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  danger: 'bg-rose-600 dark:bg-rose-400',
  purple: 'bg-purple-600 dark:bg-purple-400',
};

export interface StatusBadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  dot = false,
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap leading-5 ${BADGE_STYLES[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_STYLES[variant]}`} />}
      {children}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 SectionCard                                */
/* -------------------------------------------------------------------------- */

export interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  noPadding = false,
  className = '',
}) => {
  return (
    <section className={`surface-card rounded-xl overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 leading-snug">
                {icon && <span className="text-primary shrink-0">{icon}</span>}
                <span className="break-words">{title}</span>
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  FilterBar                                 */
/* -------------------------------------------------------------------------- */

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Пребарај...',
  children,
  className = '',
}) => {
  return (
    <div
      className={`surface-card rounded-xl px-3.5 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${className}`}
    >
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[240px] xl:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-8 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Исчисти пребарување"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {children && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   TabBar                                   */
/* -------------------------------------------------------------------------- */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center flex-wrap gap-x-1 gap-y-0.5 border-b border-border ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-semibold ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 EmptyState                                 */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-2.5">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-muted/80 text-muted-foreground flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-md">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
