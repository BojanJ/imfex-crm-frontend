'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import { getUserRoleLabel } from '@/lib/enum-labels';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  backHref?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title,
  description,
  backHref = '/',
}) => {
  const { t, locale } = useI18n();
  const role = imfexStore.getCurrentRole();

  return (
    <div className="max-w-md mx-auto my-16 surface-card rounded-2xl p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-base font-bold text-foreground">
          {title || t('rbac.access_denied_title')}
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description || t('rbac.access_denied_desc')}
        </p>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-[11px] text-muted-foreground">
        <span>{t('rbac.current_role')}:</span>
        <strong className="text-foreground font-semibold">{getUserRoleLabel(role, locale)}</strong>
      </div>
      <div className="pt-2">
        <Link
          href={backHref}
          className="h-9 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('rbac.back_to_dashboard')}</span>
        </Link>
      </div>
    </div>
  );
};
