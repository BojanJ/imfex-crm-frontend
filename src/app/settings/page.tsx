'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore } from '@/lib/store';
import { UserProfile, UserRole } from '@/types';
import {
  Settings,
  Building2,
  Save,
  CheckCircle2,
  Users,
  Plus,
  KeyRound,
  Shield,
  User,
  Ban,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'USERS' | 'COMPANY'>('USERS');

  // User Management State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newTempPassword, setNewTempPassword] = useState('IMFEX2026!');
  const [resetMessage, setResetMessage] = useState('');

  // Company Info State
  const [companyName, setCompanyName] = useState('IMFEX Solutions Ltd.');
  const [companyAddress, setCompanyAddress] = useState('100 Commercial Boulevard, Suite 400');
  const [companyTaxId, setCompanyTaxId] = useState('EX-99201928');
  const [companyEmail, setCompanyEmail] = useState('info@imfex.com');
  const [companyPhone, setCompanyPhone] = useState('+49 89 9988776');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const refreshProfiles = () => {
    setProfiles(imfexStore.getProfiles());
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim()) return;

    imfexStore.createUserProfile(newFullName, newEmail, newRole, newTempPassword);
    refreshProfiles();
    setNewFullName('');
    setNewEmail('');
    setNewTempPassword('IMFEX2026!');
    setShowAddUserModal(false);
    alert(`Корисникот ${newFullName} е успешно креиран. Привремена лозинка: ${newTempPassword}`);
  };

  const handleResetPassword = (userId: string, email: string) => {
    const tempPass = imfexStore.resetUserPassword(userId);
    refreshProfiles();
    setResetMessage(`Лозинката за ${email} е ресетирана на: ${tempPass}`);
    setTimeout(() => setResetMessage(''), 5000);
  };

  const handleToggleStatus = (userId: string) => {
    imfexStore.toggleUserStatus(userId);
    refreshProfiles();
  };

  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl pb-16">
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

        {/* Sub-tabs */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs font-bold">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'USERS' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <Users className="w-4 h-4" /> {t('users.title')}
          </button>
          <button
            onClick={() => setActiveTab('COMPANY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'COMPANY' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <Building2 className="w-4 h-4" /> {t('settings.company_details')}
          </button>
        </div>
      </div>

      {resetMessage && (
        <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Tab 1: User Accounts & Password Resets */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              {t('users.subtitle')}
            </h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t('users.create_user')}
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-4">{t('users.full_name')}</th>
                    <th className="p-4">{t('users.email')}</th>
                    <th className="p-4">{t('users.role')}</th>
                    <th className="p-4">{t('users.status')}</th>
                    <th className="p-4 text-center">{t('offers.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map((usr) => (
                    <tr key={usr.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[11px]">
                          {usr.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{usr.fullName}</span>
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">{usr.email}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            usr.role === 'SUPER_ADMIN'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {usr.role === 'SUPER_ADMIN' ? 'Супер Администратор' : 'Продажен Агент'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            usr.status === 'DISABLED'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {usr.status === 'DISABLED' ? t('users.disabled') : t('users.active')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResetPassword(usr.id, usr.email)}
                            className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Ресетирај Лозинка"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" /> {t('users.reset_password')}
                          </button>
                          <button
                            onClick={() => handleToggleStatus(usr.id)}
                            className={`p-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                              usr.status === 'DISABLED'
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                            }`}
                            title={usr.status === 'DISABLED' ? 'Овозможи' : 'Оневозможи'}
                          >
                            {usr.status === 'DISABLED' ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Company Details Form */}
      {activeTab === 'COMPANY' && (
        <form onSubmit={handleSaveCompanySettings} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t('settings.save_success')}
            </div>
          )}

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
      )}

      {/* Create User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs">
            <h3 className="font-bold text-lg">{t('users.create_user')}</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">{t('users.full_name')} *</label>
                <input
                  type="text"
                  required
                  placeholder="пр. Игор Марковски"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('users.email')} *</label>
                <input
                  type="email"
                  required
                  placeholder="igor@imfex.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('users.role')}</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-bold outline-none"
                >
                  <option value="USER">Продажен Агент (USER)</option>
                  <option value="SUPER_ADMIN">Супер Администратор (SUPER_ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">{t('users.temp_password')}</label>
                <input
                  type="text"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background outline-none font-mono font-bold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('users.first_time_login_notice')}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-1.5 font-semibold rounded-lg border border-border cursor-pointer"
                >
                  Откажи
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-sm"
                >
                  {t('users.create_user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
