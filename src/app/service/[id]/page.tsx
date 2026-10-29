'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { ConsumedPart, ServicePriority, ServiceStatus, ServiceTicket, UserProfile } from '@/types';
import { imfexStore, useImfexStore, getApiUrl } from '@/lib/store';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ServiceTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const router = useRouter();
  const ticketId = resolvedParams?.id;
  useImfexStore(); // Auto-subscribe to live store updates

  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [status, setStatus] = useState<ServiceStatus>('OPEN');
  const [priority, setPriority] = useState<ServicePriority>('MEDIUM');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [laborHours, setLaborHours] = useState<number>(0);
  const [solution, setSolution] = useState<string>('');
  const [partsConsumed, setPartsConsumed] = useState<ConsumedPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const applyTicketData = (t: ServiceTicket) => {
    setTicket(t);
    setStatus(t.status);
    setPriority(t.priority);
    setAssignedTechnicianId(t.assignedTechnicianId || '');
    setScheduledDate(t.scheduledDate || '');
    setLaborHours(Number(t.laborHours || 0));
    setSolution(t.solution || '');
    setPartsConsumed(t.partsConsumed || []);
  };

  useEffect(() => {
    setProfiles(imfexStore.getProfiles());
    if (!ticketId) return;

    // 1. Check local store
    const local = imfexStore.getServiceTicketById(ticketId);
    if (local) {
      applyTicketData(local);
      setIsLoading(false);
      return;
    }

    // 2. Fetch directly from backend API
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/service-tickets/${ticketId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          applyTicketData(data);
        } else {
          const storeFound = imfexStore.getServiceTicketById(ticketId);
          if (storeFound) applyTicketData(storeFound);
        }
      })
      .catch((err) => console.warn('Fetch service ticket notice:', err))
      .finally(() => setIsLoading(false));
  }, [ticketId, imfexStore.isLoadedFromBackend, imfexStore.getServiceTickets().length]);

  const handleSaveTicket = (overridingStatus?: ServiceStatus) => {
    if (!ticket) return;
    const nextStatus = overridingStatus || status;

    const updated: ServiceTicket = {
      ...ticket,
      status: nextStatus,
      priority,
      assignedTechnicianId,
      assignedTechnician: profiles.find((p) => p.id === assignedTechnicianId),
      scheduledDate,
      laborHours,
      solution,
      partsConsumed,
      closedAt: nextStatus === 'CLOSED' ? new Date().toISOString() : ticket.closedAt,
    };

    const saved = imfexStore.saveServiceTicket(updated);
    setTicket(saved);
    setStatus(nextStatus);

    if (nextStatus === 'CLOSED') {
      alert(`Барањето за сервис ${saved.ticketNumber} е ЗАТВОРЕНО.`);
    } else {
      alert(`Барањето за сервис ${saved.ticketNumber} е ажурирано.`);
    }
  };

  const handleAddPart = () => {
    const newPart: ConsumedPart = {
      id: `p-${Date.now()}`,
      name: 'Резервен Опто-Сензор / Релеј',
      code: 'REL-FUS-12V',
      quantity: 1,
      unitCost: 15.00,
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

  if (isLoading && !ticket && !imfexStore.isLoadedFromBackend) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Се вчитуваат детали за сервисот од базата...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm text-xs">
        <p className="text-sm font-bold text-red-500">Сервисниот тикет не е пронајден</p>
        <p className="text-muted-foreground">
          Бараниот тикет (ID: <code className="font-mono">{ticketId}</code>) не постои или е избришан.
        </p>
        <div className="pt-2">
          <button
            onClick={() => router.push('/service')}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Назад кон Сервис
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/service')}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              <span>Барање за Сервис {ticket.ticketNumber}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('offers.customer')}: {ticket.customer?.companyName || ticket.customer?.name} • Опрема: {ticket.installedItem?.title || 'Општо Одржување'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-500" /> {t('service.generate_report')}
          </button>
          {status !== 'CLOSED' && (
            <button
              onClick={() => handleSaveTicket('CLOSED')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> {t('service.close_ticket')}
            </button>
          )}
          <button
            onClick={() => handleSaveTicket()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" /> {t('projects.save_changes')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-primary" /> Распоред на Техничар и Закажување
            </h3>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">{t('service.status')}</label>
              <SearchableSelect
                options={[
                  { value: 'OPEN', label: 'ОТВОРЕНО' },
                  { value: 'ASSIGNED', label: 'ДОДЕЛЕНО' },
                  { value: 'IN_PROGRESS', label: 'ВО ТЕК' },
                  { value: 'COMPLETED', label: 'ЗАВРШЕНО' },
                  { value: 'CLOSED', label: 'ЗАТВОРЕНО' },
                ]}
                value={status}
                onChange={(val) => setStatus(val as ServiceStatus)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-primary outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">{t('service.priority')}</label>
              <SearchableSelect
                options={[
                  { value: 'LOW', label: 'НИЗОК' },
                  { value: 'MEDIUM', label: 'СРЕДЕН' },
                  { value: 'HIGH', label: 'ВИСОК' },
                  { value: 'URGENT', label: 'ИТНО' },
                ]}
                value={priority}
                onChange={(val) => setPriority(val as ServicePriority)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none text-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">{t('service.technician')}</label>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Додели Техничар --' },
                  ...profiles.map((p) => ({
                    value: p.id,
                    label: `${p.fullName} (${p.role})`,
                  })),
                ]}
                value={assignedTechnicianId}
                onChange={(val) => setAssignedTechnicianId(val)}
                placeholder="-- Додели Техничар --"
                searchPlaceholder="Пребарај техничар..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">{t('service.scheduled_date')}</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <h3 className="font-bold text-xs uppercase text-muted-foreground">{t('service.defect')}</h3>
            <p className="p-3 bg-muted/30 rounded-lg border border-border font-medium text-foreground text-sm">
              "{ticket.defectDescription}"
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> {t('service.parts_consumed')}
              </h3>
              <button onClick={handleAddPart} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> {t('service.add_part')}
              </button>
            </div>

            {partsConsumed.map((part, idx) => (
              <div key={part.id || idx} className="p-3 bg-muted/20 border border-border rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => handleUpdatePart(idx, { name: e.target.value })}
                    className="w-full px-2 py-1 rounded border border-border bg-background font-bold outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={part.quantity}
                      onChange={(e) => handleUpdatePart(idx, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-12 px-1 py-1 rounded border border-border bg-background text-center outline-none font-bold"
                    />
                    <span>x</span>
                    <input
                      type="number"
                      step="0.01"
                      value={part.unitCost}
                      onChange={(e) => handleUpdatePart(idx, { unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-1 py-1 rounded border border-border bg-background outline-none font-bold"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between font-extrabold text-foreground">
                  <span>€{(part.quantity * part.unitCost).toFixed(2)}</span>
                  <button onClick={() => handleRemovePart(idx)} className="text-red-500 p-1 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Clock className="w-4 h-4 text-primary" /> Работни Часови и Забелешки за Решение
            </h3>

            <div>
              <label className="block font-bold mb-1 text-muted-foreground">{t('service.labor_hours')}</label>
              <input
                type="number"
                step="0.5"
                value={laborHours}
                onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 rounded-lg border border-border bg-background font-bold text-primary outline-none"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-muted-foreground">{t('service.solution')}</label>
              <textarea
                rows={4}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="Опис на извршениот сервис, тестирање и дијагностика..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> {t('service.generate_report')} - {ticket.ticketNumber}
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-muted-foreground font-bold">✕</button>
            </div>

            <div className="space-y-4 p-6 bg-white text-gray-900 rounded-xl border border-gray-200">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-blue-900">IMFEX ИЗВЕШТАЈ ЗА СЕРВИС</h2>
                  <p className="text-xs text-gray-500">Тикет #: {ticket.ticketNumber}</p>
                </div>
              </div>
              <p className="font-bold">Дефект: {ticket.defectDescription}</p>
              <p>Решение: {solution || 'Завршено'}</p>
            </div>

            <div className="flex justify-end">
              <button onClick={() => window.print()} className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 cursor-pointer">
                <Printer className="w-4 h-4" /> {t('service.print_pdf')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
