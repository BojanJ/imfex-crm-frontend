'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore, useImfexStore, generateTempPassword } from '@/lib/store';
import { UserProfile, UserRole } from '@/types';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Settings,
  Building2,
  Save,
  CheckCircle2,
  Users,
  Plus,
  KeyRound,
  Ban,
  Check,
  RefreshCw,
  Database,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

import { toast } from '@/components/ui/toastr';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useEscapeKey } from '@/components/ui/use-escape-key';

export default function SettingsPage() {
  const { t } = useI18n();
  const storeVersion = useImfexStore();
  const isSuperAdmin = imfexStore.getCurrentRole() === 'SUPER_ADMIN';
  const currentUser = imfexStore.getCurrentUser();
  const [activeTab, setActiveTab] = useState<'USERS' | 'COMPANY' | 'SECURITY'>(() =>
    imfexStore.getCurrentRole() === 'SUPER_ADMIN' ? 'USERS' : 'SECURITY'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Voluntary Change Password state (available to all authenticated users)
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'SECURITY') {
      setActiveTab('SECURITY');
    }
  }, [isSuperAdmin, activeTab]);

  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Syncing with PostgreSQL database and purging corrupted records...');
    await imfexStore.purgeCorruptedAndSyncBackend();
    setIsSyncing(false);
    toast.success('Синхронизацијата е завршена!', 'Базата на податоци е успешно синхронизирана со PostgreSQL.');
    setSyncStatusMsg('Database clean & synchronization complete!');
    setTimeout(() => setSyncStatusMsg(''), 4000);
  };

  const handleExecuteFullReset = async () => {
    setIsResetting(true);
    await imfexStore.resetDatabaseToFreshState();
    setIsResetting(false);
    setShowResetModal(false);
    toast.warning('Базата е ресетирана!', 'Базата е поставена на чиста состојба.');
    setSyncStatusMsg('Database cleanly reset to 0 records. Only admin@imfex.com remains active.');
    setTimeout(() => setSyncStatusMsg(''), 5000);
  };

  // User Management State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(true);
  const [resetMessage, setResetMessage] = useState('');

  // Company Info State (hydrated from PostgreSQL /api/company-settings)
  const initialCompany = imfexStore.getCompanySettings();
  const [companyName, setCompanyName] = useState(initialCompany.companyName);
  const [companyAddress, setCompanyAddress] = useState(initialCompany.address);
  const [companyTaxId, setCompanyTaxId] = useState(initialCompany.taxId);
  const [companyEmail, setCompanyEmail] = useState(initialCompany.email);
  const [companyPhone, setCompanyPhone] = useState(initialCompany.phone);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const companyHydratedRef = React.useRef(false);

  const refreshProfiles = () => {
    setProfiles(imfexStore.getProfiles());
  };

  useEffect(() => {
    refreshProfiles();
    if (!companyHydratedRef.current && imfexStore.isLoadedFromBackend) {
      companyHydratedRef.current = true;
      const cs = imfexStore.getCompanySettings();
      setCompanyName(cs.companyName);
      setCompanyAddress(cs.address);
      setCompanyTaxId(cs.taxId);
      setCompanyEmail(cs.email);
      setCompanyPhone(cs.phone);
    }
  }, [storeVersion]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !newFullName.trim() || !newEmail.trim()) return;
    if (newTempPassword.trim().length > 0 && newTempPassword.trim().length < 8) {
      toast.error('Привремената лозинка мора да има најмалку 8 карактери.');
      return;
    }

    const createdName = newFullName.trim();
    const { tempPassword } = imfexStore.createUserProfile(newFullName, newEmail, newRole, newTempPassword);
    refreshProfiles();
    setNewFullName('');
    setNewEmail('');
    setNewTempPassword('');
    setShowAddUserModal(false);
    toast.success(
      `Корисникот ${createdName} е креиран!`,
      `Привремена лозинка (еднократен приказ): ${tempPassword}`,
      10000
    );
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);

    if (!currentPwd.trim()) {
      setPwdError('Внесете ја тековната лозинка.');
      return;
    }
    if (newPwd.trim().length < 8) {
      setPwdError('Новата лозинка мора да содржи најмалку 8 карактери.');
      return;
    }
    if (newPwd.trim() === currentPwd.trim()) {
      setPwdError('Новата лозинка мора да се разликува од тековната.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Новите лозинки не се совпаѓаат.');
      return;
    }

    setIsChangingPwd(true);
    const result = await imfexStore.changePasswordAsync(currentPwd.trim(), newPwd.trim());
    setIsChangingPwd(false);

    if (!result.ok) {
      setPwdError(result.error || 'Грешка при промена на лозинката.');
      return;
    }

    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdSuccess(true);
    toast.success('Лозинката е успешно променета!');
    setTimeout(() => setPwdSuccess(false), 4000);
  };

  const handleResetPassword = (userId: string, email: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Ресетирај лозинка на корисник',
      message: `Дали сте сигурни дека сакате да ја ресетирате лозинката за корисникот „${email}“?`,
      confirmLabel: 'Да, ресетирај',
      variant: 'warning',
      onConfirm: () => {
        const tempPass = imfexStore.resetUserPassword(userId);
        refreshProfiles();
        setResetMessage(`Лозинката за ${email} е ресетирана на: ${tempPass}`);
        setTimeout(() => setResetMessage(''), 5000);
        setConfirmState(null);
      },
    });
  };

  const handleToggleStatus = (userId: string) => {
    const usr = profiles.find((p) => p.id === userId);
    const nextAction = usr?.status === 'DISABLED' ? 'активирате' : 'оневозможите';
    setConfirmState({
      isOpen: true,
      title: 'Промена на статус на корисник',
      message: `Дали сте сигурни дека сакате да го ${nextAction} корисничкиот профил „${usr?.fullName || userId}“?`,
      confirmLabel: 'Да, промени статус',
      variant: usr?.status === 'DISABLED' ? 'success' : 'danger',
      onConfirm: () => {
        imfexStore.toggleUserStatus(userId);
        refreshProfiles();
        setConfirmState(null);
      },
    });
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await imfexStore.saveCompanySettings({
      companyName: companyName.trim(),
      address: companyAddress.trim(),
      taxId: companyTaxId.trim(),
      email: companyEmail.trim(),
      phone: companyPhone.trim(),
    });
    if (saved) {
      setSavedSuccess(true);
      toast.success('Податоците за компанијата се зачувани!');
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  useEscapeKey(showResetModal && !isResetting, () => {
    setShowResetModal(false);
    setResetConfirmText('');
  });
  useEscapeKey(showAddUserModal, () => setShowAddUserModal(false));

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div className="min-w-0">
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary shrink-0" />
            <span>{t('settings.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center bg-muted p-1 rounded-xl border border-border text-xs font-bold shrink-0 self-start sm:self-auto gap-1">
          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('USERS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'USERS' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" /> {t('users.title')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPANY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'COMPANY' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" /> {t('settings.company_details')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'SECURITY' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" /> Безбедност
          </button>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="p-3.5 bg-muted/60 border border-border text-muted-foreground rounded-xl text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0 text-primary" />
          <span>
            Управувањето со корисници и системските подесувања на компанијата се достапни само за <strong>Супер Администратор</strong>. Овде можете да ја промените вашата лозинка.
          </span>
        </div>
      )}

      {resetMessage && (
        <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Tab 1: User Accounts & Password Resets (SUPER_ADMIN only) */}
      {isSuperAdmin && activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              {t('users.subtitle')}
            </h2>
            <button
              onClick={() => {
                setNewTempPassword(generateTempPassword(12));
                setShowTempPassword(true);
                setShowAddUserModal(true);
              }}
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
                          {(usr.fullName || usr.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span>{usr.fullName || usr.email}</span>
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">{usr.email}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                            usr.role === 'SUPER_ADMIN'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {usr.role === 'SUPER_ADMIN' ? 'Супер Администратор' : 'Продажен Агент'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
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

      {/* Tab 2: Company Details Form (SUPER_ADMIN only) */}
      {isSuperAdmin && activeTab === 'COMPANY' && (
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

      {/* Separated Super-Admin Danger Zone (outside Company Info form) */}
      {activeTab === 'COMPANY' && isSuperAdmin && (
        <div className="bg-card border-2 border-rose-500/30 rounded-xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 border-b border-rose-500/20 pb-3">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                Опасна Зона — Администрација на База (Само Супер Администратор)
              </h3>
              <p className="text-[11px] text-muted-foreground font-normal">
                Овие акции директно ја менуваат или бришат базата на податоци и се оневозможени во продукција по дифолт.
              </p>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="space-y-0.5">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" /> Чистење и синхронизација на записи
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ги отстранува оштетените записи со „?“ и повторно ги синхронизира податоците од PostgreSQL.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncDatabase}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Се синхронизира...' : 'Исчисти и Синхронизирај'}
            </button>
          </div>

          <div className="border-t border-rose-500/20 pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-bold text-rose-600 dark:text-rose-400">Целосно ресетирање на системот</p>
              <p className="text-[11px] text-muted-foreground">
                Трајно ги брише сите деловни записи и ги остава само активниот Супер Администратор и 0 записи.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setResetConfirmText('');
                setShowResetModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Ресетирај Систем
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Personal Security & Password Change (All Authenticated Users) */}
      {activeTab === 'SECURITY' && (
        <form
          onSubmit={handleChangeOwnPassword}
          className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 text-xs max-w-xl"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Промена на сопствена лозинка
              </h2>
              {currentUser?.email && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Сметка: <span className="font-semibold text-foreground">{currentUser.email}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPwdFields((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[11px] font-semibold cursor-pointer"
            >
              {showPwdFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPwdFields ? 'Сокриј' : 'Прикажи'}
            </button>
          </div>

          {pwdSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Лозинката е успешно променета!</span>
            </div>
          )}

          {pwdError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
              {pwdError}
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1 text-foreground">Тековна лозинка *</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1 text-foreground">
                Нова лозинка (мин. 8 знаци) *
              </label>
              <input
                type={showPwdFields ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Најмалку 8 карактери"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Потврди нова лозинка *</label>
              <input
                type={showPwdFields ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Повторете ја новата лозинка"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChangingPwd}
              className="flex items-center gap-1.5 px-5 py-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isChangingPwd ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Се зачувува...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Промени лозинка
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Reset Confirmation Modal */}
      {isSuperAdmin && showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={() => {
            if (!isResetting) {
              setShowResetModal(false);
              setResetConfirmText('');
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Потврда за целосно ресетирање на базата"
        >
          <div
            className="bg-card border border-rose-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Целосно бришење и ресетирање?</h3>
                <p className="text-[11px] text-muted-foreground">Опасна Зона — Неповратна акција врз базата</p>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Оваа акција трајно ќе ги избрише <strong>сите Клиенти, Производи, Категории, Понуди, Проекти, Фактури, Уплати, Сервисни тикети, Документи и Настани</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="block font-bold text-foreground">
                Внесете <code className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 font-mono">RESET</code> за потврда:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 rounded-lg border border-rose-500/40 bg-background font-mono font-bold outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                disabled={isResetting}
                className="px-4 py-2 font-bold rounded-xl border border-border bg-card hover:bg-muted cursor-pointer"
              >
                Откажи
              </button>
              <button
                type="button"
                onClick={handleExecuteFullReset}
                disabled={isResetting || resetConfirmText.trim() !== 'RESET'}
                className="flex items-center gap-2 px-5 py-2 font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {isResetting ? 'Се ресетира...' : 'Да, Ресетирај База'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isSuperAdmin && showAddUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          onClick={() => setShowAddUserModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('users.create_user')}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl text-xs"
            onClick={(e) => e.stopPropagation()}
          >
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
                <SearchableSelect
                  options={[
                    { value: 'USER', label: 'Продажен Агент (USER)' },
                    { value: 'SUPER_ADMIN', label: 'Супер Администратор (SUPER_ADMIN)' },
                  ]}
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-bold outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold">{t('users.temp_password')} *</label>
                  <button
                    type="button"
                    onClick={() => setNewTempPassword(generateTempPassword(12))}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Генерирај нова
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newTempPassword}
                    onChange={(e) => setNewTempPassword(e.target.value)}
                    placeholder="Најмалку 8 карактери"
                    className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-border bg-background outline-none font-mono font-bold focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword((v) => !v)}
                    aria-label={showTempPassword ? 'Сокриј лозинка' : 'Прикажи лозинка'}
                    className="absolute right-2.5 top-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmState?.isOpen)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant || 'warning'}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
