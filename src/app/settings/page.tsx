'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore, useImfexStore, generateTempPassword } from '@/lib/store';
import {
  useCompanySettingsQuery,
  useProfilesQuery,
  useUpdateCompanySettingsMutation,
} from '@/lib/queries';
import { getUserRoleLabel } from '@/lib/enum-labels';
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
  X,
} from 'lucide-react';
import { toast } from '@/components/ui/toastr';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useEscapeKey } from '@/components/ui/use-escape-key';
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  TabBar,
  TabItem,
} from '@/components/ui/page-primitives';

type SettingsTab = 'USERS' | 'COMPANY' | 'SECURITY' | 'MAINTENANCE';

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const storeVersion = useImfexStore();
  const isSuperAdmin = imfexStore.getCurrentRole() === 'SUPER_ADMIN';
  const currentUser = imfexStore.getCurrentUser();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    imfexStore.getCurrentRole() === 'SUPER_ADMIN' ? 'USERS' : 'SECURITY'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Voluntary Change Password state
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
    setSyncStatusMsg('Синхронизација со PostgreSQL базата...');
    await imfexStore.purgeCorruptedAndSyncBackend();
    setIsSyncing(false);
    toast.success('Синхронизацијата е завршена!', 'Базата на податоци е успешно синхронизирана со PostgreSQL.');
    setSyncStatusMsg('Чистењето и синхронизацијата се успешно завршени!');
    setTimeout(() => setSyncStatusMsg(''), 4000);
  };

  const handleExecuteFullReset = async () => {
    setIsResetting(true);
    await imfexStore.resetDatabaseToFreshState();
    setIsResetting(false);
    setShowResetModal(false);
    toast.warning('Базата е ресетирана!', 'Базата е поставена на чиста состојба.');
    setSyncStatusMsg('Базата е ресетирана на 0 записи. Активен е само Супер Администраторот.');
    setTimeout(() => setSyncStatusMsg(''), 5000);
  };

  const profilesQuery = useProfilesQuery();
  const companySettingsQuery = useCompanySettingsQuery();
  const updateCompanyMutation = useUpdateCompanySettingsMutation();

  // User Management State
  const profiles: UserProfile[] = profilesQuery.data ?? imfexStore.getProfiles();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(true);
  const [resetMessage, setResetMessage] = useState('');

  // Company Info State
  const initialCompany = companySettingsQuery.data ?? imfexStore.getCompanySettings();
  const [companyName, setCompanyName] = useState(initialCompany.companyName);
  const [companyAddress, setCompanyAddress] = useState(initialCompany.address);
  const [companyTaxId, setCompanyTaxId] = useState(initialCompany.taxId);
  const [companyEmail, setCompanyEmail] = useState(initialCompany.email);
  const [companyPhone, setCompanyPhone] = useState(initialCompany.phone);
  const [companyBankAccount, setCompanyBankAccount] = useState(initialCompany.bankAccount || '');
  const [companyDefaultAdvance, setCompanyDefaultAdvance] = useState(
    String(initialCompany.defaultAdvancePercent ?? 50)
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const companyHydratedRef = React.useRef(false);

  const refreshProfiles = () => {
    void profilesQuery.refetch();
  };

  useEffect(() => {
    const cs = companySettingsQuery.data;
    if (!companyHydratedRef.current && cs) {
      companyHydratedRef.current = true;
      setCompanyName(cs.companyName);
      setCompanyAddress(cs.address);
      setCompanyTaxId(cs.taxId);
      setCompanyEmail(cs.email);
      setCompanyPhone(cs.phone);
      setCompanyBankAccount(cs.bankAccount || '');
      setCompanyDefaultAdvance(String(cs.defaultAdvancePercent ?? 50));
    }
  }, [companySettingsQuery.data, storeVersion]);

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
        setTimeout(() => setResetMessage(''), 8000);
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
    const parsedAdvance = Math.min(100, Math.max(0, Math.round(Number(companyDefaultAdvance) || 50)));
    try {
      const saved = await updateCompanyMutation.mutateAsync({
        companyName: companyName.trim(),
        address: companyAddress.trim(),
        taxId: companyTaxId.trim(),
        email: companyEmail.trim(),
        phone: companyPhone.trim(),
        bankAccount: companyBankAccount.trim() || undefined,
        defaultAdvancePercent: parsedAdvance,
      });
      if (saved) {
        setCompanyDefaultAdvance(String(saved.defaultAdvancePercent ?? parsedAdvance));
        setSavedSuccess(true);
        toast.success('Податоците за компанијата се зачувани!');
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      // Error toast and rollback handled by useUpdateCompanySettingsMutation
    }
  };

  useEscapeKey(showResetModal && !isResetting, () => {
    setShowResetModal(false);
    setResetConfirmText('');
  });
  useEscapeKey(showAddUserModal, () => setShowAddUserModal(false));

  const tabs: TabItem[] = isSuperAdmin
    ? [
        {
          id: 'USERS',
          label: locale === 'mk' ? 'Корисници' : 'Users',
          count: profiles.length,
          icon: <Users className="w-3.5 h-3.5" />,
        },
        {
          id: 'COMPANY',
          label: locale === 'mk' ? 'Компанија' : 'Company',
          icon: <Building2 className="w-3.5 h-3.5" />,
        },
        {
          id: 'SECURITY',
          label: t('settings.security_tab'),
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
        },
        {
          id: 'MAINTENANCE',
          label: locale === 'mk' ? 'Одржување' : 'Maintenance',
          icon: <Database className="w-3.5 h-3.5" />,
        },
      ]
    : [
        {
          id: 'SECURITY',
          label: t('settings.security_tab'),
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
        },
      ];

  const inputClass =
    'w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-xs';

  return (
    <div className="space-y-6 pb-16">
      {/* Unified PageHeader — never crushes title */}
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        icon={<Settings className="w-5 h-5" />}
        actions={
          isSuperAdmin && activeTab === 'USERS' ? (
            <button
              type="button"
              onClick={() => {
                setNewTempPassword(generateTempPassword(12));
                setShowTempPassword(true);
                setShowAddUserModal(true);
              }}
              className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('users.create_user')}</span>
            </button>
          ) : undefined
        }
      />

      {/* Clean Horizontal Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as SettingsTab)}
      />

      {!isSuperAdmin && (
        <div className="p-3.5 bg-muted/50 border border-border text-muted-foreground rounded-xl text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 shrink-0 text-primary" />
          <span>
            Управувањето со корисници и системските подесувања на компанијата се достапни само за{' '}
            <strong className="text-foreground">Супер Администратор</strong>. Овде можете да ја промените вашата лозинка.
          </span>
        </div>
      )}

      {resetMessage && (
        <div className="p-3.5 bg-primary/10 border border-primary/25 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-medium flex items-center gap-2">
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Tab 1: Users */}
      {isSuperAdmin && activeTab === 'USERS' && (
        <SectionCard
          title={t('users.title')}
          subtitle={t('users.subtitle')}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t('users.full_name')}</th>
                  <th className="px-4 py-3">{t('users.email')}</th>
                  <th className="px-4 py-3">{t('users.role')}</th>
                  <th className="px-4 py-3">{t('users.status')}</th>
                  <th className="px-5 py-3 text-right">{t('offers.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {profiles.map((usr) => (
                  <tr key={usr.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-[11px] shrink-0">
                          {(usr.fullName || usr.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span>{usr.fullName || usr.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{usr.email}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge variant={usr.role === 'SUPER_ADMIN' ? 'primary' : 'neutral'}>
                        {getUserRoleLabel(usr.role, locale)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge
                        variant={usr.status === 'DISABLED' ? 'danger' : 'success'}
                        dot
                      >
                        {usr.status === 'DISABLED' ? t('users.disabled') : t('users.active')}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(usr.id, usr.email)}
                          className="h-7 px-2.5 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Ресетирај Лозинка"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{t('users.reset_password')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(usr.id)}
                          className={`h-7 w-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors ${
                            usr.status === 'DISABLED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title={usr.status === 'DISABLED' ? 'Овозможи' : 'Оневозможи'}
                          aria-label={usr.status === 'DISABLED' ? 'Овозможи' : 'Оневозможи'}
                        >
                          {usr.status === 'DISABLED' ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Tab 2: Company Details */}
      {isSuperAdmin && activeTab === 'COMPANY' && (
        <div className="max-w-3xl">
          <SectionCard
            title={t('settings.company_details')}
            subtitle="Податоците се користат автоматски на PDF понуди, фактури, испратници и е-пошта."
            icon={<Building2 className="w-4 h-4" />}
          >
            <form onSubmit={handleSaveCompanySettings} className="space-y-4 text-xs">
              {savedSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t('settings.save_success')}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">{t('settings.company_name')}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">{t('settings.tax_id')}</label>
                  <input
                    type="text"
                    value={companyTaxId}
                    onChange={(e) => setCompanyTaxId(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">{t('settings.email')}</label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">{t('settings.phone')}</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-muted-foreground">{t('settings.address')}</label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">{t('settings.bank_account')}</label>
                  <input
                    type="text"
                    value={companyBankAccount}
                    onChange={(e) => setCompanyBankAccount(e.target.value)}
                    placeholder="пр. 300000001234567 (Комерцијална Банка)"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">{t('settings.default_advance')}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={companyDefaultAdvance}
                    onChange={(e) => setCompanyDefaultAdvance(e.target.value)}
                    className={`${inputClass} tabular-nums font-medium`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border/70">
                <button
                  type="submit"
                  className="h-9 px-4 font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('settings.save_settings')}</span>
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {/* Tab 3: Personal Security */}
      {activeTab === 'SECURITY' && (
        <div className="max-w-xl">
          <SectionCard
            title="Промена на сопствена лозинка"
            subtitle={currentUser?.email ? `Сметка: ${currentUser.email}` : undefined}
            icon={<ShieldCheck className="w-4 h-4" />}
            action={
              <button
                type="button"
                onClick={() => setShowPwdFields((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[11px] font-medium cursor-pointer transition-colors"
              >
                {showPwdFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPwdFields ? 'Сокриј' : 'Прикажи'}</span>
              </button>
            }
          >
            <form onSubmit={handleChangeOwnPassword} className="space-y-4 text-xs">
              {pwdSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Лозинката е успешно променета!</span>
                </div>
              )}

              {pwdError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg font-medium">
                  {pwdError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-medium text-muted-foreground">Тековна лозинка *</label>
                <input
                  type={showPwdFields ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">
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
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-muted-foreground">Потврди нова лозинка *</label>
                  <input
                    type={showPwdFields ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Повторете ја новата лозинка"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border/70">
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="h-9 px-4 font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isChangingPwd ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Се зачувува...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" /> Промени лозинка
                    </>
                  )}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {/* Tab 4: Database Maintenance & Danger Zone (SUPER_ADMIN only) */}
      {isSuperAdmin && activeTab === 'MAINTENANCE' && (
        <div className="max-w-3xl space-y-5 text-xs">
          {syncStatusMsg && (
            <div className="p-3 bg-primary/10 border border-primary/25 text-blue-700 dark:text-blue-400 rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          <SectionCard
            title="Синхронизација на база"
            subtitle="Ги отстранува оштетените записи и повторно ги синхронизира податоците со PostgreSQL."
            icon={<Database className="w-4 h-4" />}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-muted-foreground max-w-lg">
                Користете ја оваа алатка доколку забележите неконзистентни записи во локалниот кеш или по масовен увоз.
              </p>
              <button
                type="button"
                onClick={handleSyncDatabase}
                disabled={isSyncing}
                className="h-9 px-4 font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Се синхронизира...' : 'Исчисти и Синхронизирај'}</span>
              </button>
            </div>
          </SectionCard>

          <section className="surface-card rounded-xl border-rose-500/35 overflow-hidden">
            <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-500/[0.04] flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Опасна Зона — Целосно ресетирање
                </h2>
                <p className="text-xs text-muted-foreground">
                  Оневозможено во продукција по дифолт. Неповратна акција.
                </p>
              </div>
            </div>
            <div className="p-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-muted-foreground max-w-lg">
                Трајно ги брише сите клиенти, производи, понуди, проекти, фактури, уплати и тикети, оставајќи го само активниот Супер Администратор.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetConfirmText('');
                  setShowResetModal(true);
                }}
                className="h-9 px-4 font-semibold rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ресетирај Систем</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isSuperAdmin && showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
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
            className="bg-card border border-rose-500/35 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Целосно бришење и ресетирање?</h3>
                  <p className="text-[11px] text-muted-foreground">Неповратна акција врз базата</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isResetting && setShowResetModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer"
                aria-label="Затвори"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-lg border border-border">
              Оваа акција трајно ќе ги избрише <strong className="text-foreground">сите деловни записи</strong> (клиенти, производи, понуди, проекти, фактури, уплати, тикети и настани).
            </p>

            <div className="space-y-1.5">
              <label className="block font-medium text-foreground">
                Внесете <code className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 font-mono">RESET</code> за потврда:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full h-9 px-3 rounded-lg border border-rose-500/40 bg-background font-mono font-semibold outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                disabled={isResetting}
                className="h-9 px-4 font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer"
              >
                Откажи
              </button>
              <button
                type="button"
                onClick={handleExecuteFullReset}
                disabled={isResetting || resetConfirmText.trim() !== 'RESET'}
                className="h-9 inline-flex items-center gap-1.5 px-4 font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isResetting ? 'Се ресетира...' : 'Ресетирај База'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isSuperAdmin && showAddUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setShowAddUserModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('users.create_user')}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-base text-foreground">{t('users.create_user')}</h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer"
                aria-label="Затвори"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('users.full_name')} *</label>
                <input
                  type="text"
                  required
                  placeholder="пр. Игор Марковски"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('users.email')} *</label>
                <input
                  type="email"
                  required
                  placeholder="igor@imfex.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('users.role')}</label>
                <SearchableSelect
                  options={[
                    { value: 'USER', label: getUserRoleLabel('USER', locale) },
                    { value: 'SUPER_ADMIN', label: getUserRoleLabel('SUPER_ADMIN', locale) },
                  ]}
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-medium outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-muted-foreground">{t('users.temp_password')} *</label>
                  <button
                    type="button"
                    onClick={() => setNewTempPassword(generateTempPassword(12))}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
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
                    className={`${inputClass} pr-9 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword((v) => !v)}
                    aria-label={showTempPassword ? 'Сокриј лозинка' : 'Прикажи лозинка'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('users.first_time_login_notice')}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="h-9 px-4 font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer"
                >
                  Откажи
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
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
