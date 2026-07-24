'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import { UserRole } from '@/types';
import { Settings, Building2, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useI18n();
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [companyName, setCompanyName] = useState('IMFEX Solutions Ltd.');
  const [companyAddress, setCompanyAddress] = useState('100 Commercial Boulevard, Suite 400');
  const [companyTaxId, setCompanyTaxId] = useState('EX-99201928');
  const [companyEmail, setCompanyEmail] = useState('info@imfex.com');
  const [companyPhone, setCompanyPhone] = useState('+49 89 9988776');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setRole(imfexStore.getCurrentRole());
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>{t('settings.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {t('settings.save_success')}
        </div>
      )}

      {/* Company Info Form (For PDF Header) */}
      <form onSubmit={handleSaveSettings} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 text-xs">
        <h2 className="font-bold text-sm flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="w-4 h-4 text-primary" />
          {t('settings.company_details')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">{t('settings.company_name')}</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">{t('settings.tax_id')}</label>
            <input
              type="text"
              value={companyTaxId}
              onChange={(e) => setCompanyTaxId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">{t('settings.email')}</label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">{t('settings.phone')}</label>
            <input
              type="text"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">{t('settings.address')}</label>
          <input
            type="text"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" /> {t('settings.save_settings')}
          </button>
        </div>
      </form>
    </div>
  );
}
