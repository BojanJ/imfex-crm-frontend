'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { ConsumedPart, ServicePriority, ServiceStatus, ServiceTicket } from '@/types';
import { imfexStore } from '@/lib/store';
import {
  useProfilesQuery,
  useServiceTicketQuery,
  useSaveServiceTicketMutation,
} from '@/lib/queries';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ProductSelect } from '@/components/ui/entity-selectors';
import { formatDate } from '@/lib/date-format';
import { formatCurrency } from '@/lib/formatters';
import {
  getServicePriorityLabel,
  getServiceStatusLabel,
  getUserRoleLabel,
} from '@/lib/enum-labels';
import { toast } from '@/components/ui/toastr';
import { useEscapeKey } from '@/components/ui/use-escape-key';
import { PageHeader, SectionCard, StatusBadge, BadgeVariant } from '@/components/ui/page-primitives';
import {
  Wrench,
  ArrowLeft,
  User,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  FileText,
  Clock,
  Printer,
  Loader2,
  X,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function statusBadgeVariant(status: ServiceStatus): BadgeVariant {
  if (status === 'OPEN') return 'danger';
  if (status === 'ASSIGNED') return 'primary';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'success';
}

export default function ServiceTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = useI18n();
  const resolvedParams = use(params);
  const router = useRouter();
  const ticketId = resolvedParams?.id;

  const ticketQuery = useServiceTicketQuery(ticketId);
  const profilesQuery = useProfilesQuery();
  const saveTicketMutation = useSaveServiceTicketMutation();

  const profiles = profilesQuery.data ?? imfexStore.getProfiles();
  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [status, setStatus] = useState<ServiceStatus>('OPEN');
  const [priority, setPriority] = useState<ServicePriority>('MEDIUM');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [laborHours, setLaborHours] = useState<number>(0);
  const [solution, setSolution] = useState<string>('');
  const [partsConsumed, setPartsConsumed] = useState<ConsumedPart[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const hydratedIdRef = useRef<string | null>(null);

  useEscapeKey(isReportModalOpen, () => setIsReportModalOpen(false));

  const isLoading =
    (ticketQuery.isPending || ticketQuery.isLoading || (Boolean(ticketQuery.data) && !ticket)) &&
    !ticket;

  useEffect(() => {
    const tk = ticketQuery.data;
    if (!tk || hydratedIdRef.current === tk.id) return;
    hydratedIdRef.current = tk.id;
    setTicket(tk);
    setStatus(tk.status);
    setPriority(tk.priority);
    setAssignedTechnicianId(tk.assignedTechnicianId || '');
    setScheduledDate(tk.scheduledDate ? String(tk.scheduledDate).slice(0, 16) : '');
    setLaborHours(Number(tk.laborHours || 0));
    setSolution(tk.solution || '');
    setPartsConsumed(tk.partsConsumed || []);
  }, [ticketQuery.data]);

  const handleSaveTicket = (overridingStatus?: ServiceStatus) => {
    if (!ticket) return;
    const nextStatus = overridingStatus || status;

    const updated: ServiceTicket = {
      ...ticket,
      status: nextStatus,
      priority,
      assignedTechnicianId: assignedTechnicianId || undefined,
      assignedTechnician: profiles.find((p) => p.id === assignedTechnicianId),
      scheduledDate: scheduledDate || undefined,
      laborHours,
      solution,
      partsConsumed,
      closedAt: nextStatus === 'CLOSED' ? new Date().toISOString() : ticket.closedAt,
    };

    saveTicketMutation.mutate(updated, {
      onSuccess: (saved) => {
        setTicket(saved);
        setStatus(nextStatus);
        if (nextStatus === 'CLOSED') {
          toast.success(`Барањето за сервис ${saved.ticketNumber} е затворено.`);
        } else {
          toast.success(`Барањето за сервис ${saved.ticketNumber} е ажурирано.`);
        }
      },
    });
  };

  const handleAddPart = () => {
    const newPart: ConsumedPart = {
      id: `p-${Date.now()}`,
      name: 'Резервен Опто-Сензор / Релеј',
      code: 'REL-FUS-12V',
      quantity: 1,
      unitCost: 15.0,
    };
    setPartsConsumed((prev) => [...prev, newPart]);
  };

  const handleUpdatePart = (index: number, fields: Partial<ConsumedPart>) => {
    setPartsConsumed((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  const handleRemovePart = (index: number) => {
    setPartsConsumed((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPartsCost = partsConsumed.reduce(
    (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.unitCost) || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Се вчитуваат детали за сервисот...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="surface-card rounded-xl p-12 text-center space-y-4 max-w-md mx-auto my-12 text-xs">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          Сервисниот тикет не е пронајден
        </p>
        <p className="text-muted-foreground">
          Бараниот тикет (ID: <code className="font-mono">{ticketId}</code>) не постои или е избришан.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/service')}
            className="h-9 inline-flex items-center gap-1.5 px-4 font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Назад кон Сервис
          </button>
        </div>
      </div>
    );
  }

  const addPartCleanLabel = (t('service.add_part') || 'Додај Дел').replace(/^\+\s*/, '');

  return (
    <div className="space-y-6 pb-16 text-xs">
      <PageHeader
        backHref="/service"
        title={ticket.ticketNumber}
        badge={
          <StatusBadge variant={statusBadgeVariant(status)} dot>
            {getServiceStatusLabel(status, locale)}
          </StatusBadge>
        }
        subtitle={`${ticket.customer?.companyName || ticket.customer?.name || 'Клиент'} • ${
          ticket.installedItem?.title || 'Општо одржување'
        } • ${formatDate(ticket.createdAt)}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Извештај</span>
            </button>
            {status !== 'CLOSED' && (
              <button
                type="button"
                onClick={() => handleSaveTicket('CLOSED')}
                className="h-9 px-3 text-xs font-medium rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('service.close_ticket')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSaveTicket()}
              className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('projects.save_changes')}</span>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Sticky Control Sidebar */}
        <SectionCard
          className="lg:sticky lg:top-20"
          title="Распоред и Статус"
          icon={<User className="w-4 h-4" />}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-medium text-muted-foreground">{t('service.status')}</label>
              <SearchableSelect
                options={(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as ServiceStatus[]).map(
                  (s) => ({ value: s, label: getServiceStatusLabel(s, locale) })
                )}
                value={status}
                onChange={(val) => setStatus(val as ServiceStatus)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-medium text-foreground outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-muted-foreground">{t('service.priority')}</label>
              <SearchableSelect
                options={(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as ServicePriority[]).map((p) => ({
                  value: p,
                  label: getServicePriorityLabel(p, locale),
                }))}
                value={priority}
                onChange={(val) => setPriority(val as ServicePriority)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-medium text-foreground outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-muted-foreground">{t('service.technician')}</label>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Додели Техничар --' },
                  ...profiles.map((p) => ({
                    value: p.id,
                    label: `${p.fullName} (${getUserRoleLabel(p.role, locale)})`,
                  })),
                ]}
                value={assignedTechnicianId}
                onChange={(val) => setAssignedTechnicianId(val)}
                placeholder="-- Додели Техничар --"
                searchPlaceholder="Пребарај техничар..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-medium outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-medium text-muted-foreground">{t('service.scheduled_date')}</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background outline-none font-medium text-foreground"
              />
            </div>
          </div>
        </SectionCard>

        {/* Right Details Column */}
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title={t('service.defect')}>
            <p className="text-sm text-foreground leading-relaxed bg-muted/35 border border-border/80 rounded-lg p-3.5">
              {ticket.defectDescription}
            </p>
          </SectionCard>

          <SectionCard
            title={t('service.parts_consumed')}
            icon={<Wrench className="w-4 h-4" />}
            action={
              <button
                type="button"
                onClick={handleAddPart}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addPartCleanLabel} (Рачно)</span>
              </button>
            }
          >
            <div className="space-y-3">
              {/* Quick Part Selector from Inventory */}
              <div className="p-3 bg-muted/25 rounded-lg border border-border/80 flex flex-col sm:flex-row sm:items-center gap-2.5">
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  Избери од магацин:
                </span>
                <div className="flex-1 w-full">
                  <ProductSelect
                    value=""
                    onChange={(_prodId, prod) => {
                      if (prod) {
                        setPartsConsumed((prev) => [
                          ...prev,
                          {
                            id: `part-${Date.now()}`,
                            name: `${prod.name}`,
                            code: prod.code,
                            quantity: 1,
                            unitCost: Number(prod.models?.[0]?.basePrice || prod.purchasePrice || 0),
                          },
                        ]);
                        toast.success('Резервен дел додаден', `${prod.code} — ${prod.name}`);
                      }
                    }}
                    placeholder="Пребарај резервен дел по код или назив..."
                    allowClear
                  />
                </div>
              </div>

              {partsConsumed.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-xs">
                  Нема евидентирано потрошени делови.
                </p>
              ) : (
                <div className="space-y-2">
                  {partsConsumed.map((part, idx) => (
                    <div
                      key={part.id || idx}
                      className="p-2.5 bg-muted/20 border border-border/80 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={part.name}
                          onChange={(e) => handleUpdatePart(idx, { name: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background font-medium text-foreground outline-none focus:border-primary"
                        />
                      </div>
                      <div className="sm:col-span-4 flex items-center gap-1.5">
                        <input
                          type="number"
                          value={part.quantity}
                          onChange={(e) =>
                            handleUpdatePart(idx, { quantity: parseInt(e.target.value) || 1 })
                          }
                          className="w-14 h-8 px-2 rounded-md border border-border bg-background text-center outline-none tabular-nums"
                        />
                        <span className="text-muted-foreground">×</span>
                        <input
                          type="number"
                          step="0.01"
                          value={part.unitCost}
                          onChange={(e) =>
                            handleUpdatePart(idx, { unitCost: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 h-8 px-2 rounded-md border border-border bg-background outline-none tabular-nums"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 font-semibold text-foreground tabular-nums">
                        <span>{formatCurrency(part.quantity * part.unitCost)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(idx)}
                          className="p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-500/10 cursor-pointer"
                          aria-label="Отстрани дел"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t border-border/70 text-xs">
                    <span className="text-muted-foreground mr-2">Вкупно делови:</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(totalPartsCost)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Работни часови и решение"
            icon={<Clock className="w-4 h-4" />}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block font-medium text-muted-foreground">
                  {t('service.labor_hours')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={laborHours}
                  onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                  className="w-32 h-9 px-3 rounded-lg border border-border bg-background font-semibold text-foreground tabular-nums outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-muted-foreground">
                  {t('service.solution')}
                </label>
                <textarea
                  rows={4}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Опис на извршениот сервис, тестирање и дијагностика..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Printable Report Modal */}
      {isReportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsReportModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>
                  {t('service.generate_report')} — {ticket.ticketNumber}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
                aria-label="Затвори"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 p-6 bg-white text-slate-900 rounded-xl border border-slate-200">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-blue-900">IMFEX ИЗВЕШТАЈ ЗА СЕРВИС</h2>
                  <p className="text-xs text-slate-500">Тикет: {ticket.ticketNumber}</p>
                </div>
                <p className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</p>
              </div>
              <p>
                <strong className="font-semibold">Клиент:</strong>{' '}
                {ticket.customer?.companyName || ticket.customer?.name}
              </p>
              <p>
                <strong className="font-semibold">Статус:</strong> {getServiceStatusLabel(status, locale)}
              </p>
              <p>
                <strong className="font-semibold">Дефект:</strong> {ticket.defectDescription}
              </p>
              <p>
                <strong className="font-semibold">Решение:</strong>{' '}
                {solution.trim()
                  ? solution
                  : status === 'COMPLETED' || status === 'CLOSED'
                  ? locale === 'mk'
                    ? 'Завршено'
                    : 'Completed'
                  : locale === 'mk'
                  ? 'Во тек (нема внесено решение)'
                  : 'In progress (no resolution notes yet)'}
              </p>
              <p>
                <strong className="font-semibold">Работни часови:</strong> {laborHours} ч. •{' '}
                <strong className="font-semibold">Делови:</strong> {formatCurrency(totalPartsCost)}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-medium cursor-pointer"
              >
                Затвори
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-4 bg-primary text-primary-foreground font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer hover:bg-primary/90"
              >
                <Printer className="w-3.5 h-3.5" /> {t('service.print_pdf')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
