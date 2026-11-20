'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore, useImfexStore } from '@/lib/store';
import { ServiceTicket, ServiceStatus } from '@/types';
import { formatDate } from '@/lib/date-format';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { toast } from '@/components/ui/toastr';
import {
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

export default function ServiceDeskPage() {
  const { t } = useI18n();
  const storeVersion = useImfexStore();

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServiceStatus>('ALL');
  const [ticketToDelete, setTicketToDelete] = useState<ServiceTicket | null>(null);

  useEffect(() => {
    setTickets(imfexStore.getServiceTickets());
  }, [storeVersion]);

  const filtered = tickets.filter((st) => {
    const matchesStatus = statusFilter === 'ALL' || st.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (st.ticketNumber || '').toLowerCase().includes(term) ||
      (st.defectDescription || '').toLowerCase().includes(term) ||
      (st.customer?.companyName || st.customer?.name || '').toLowerCase().includes(term) ||
      (st.assignedTechnician?.fullName || '').toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/15 text-red-500 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const statusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'ASSIGNED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'COMPLETED':
      case 'CLOSED':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!imfexStore.isLoadedFromBackend) {
    return <PageLoadingSkeleton cards={0} rows={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <span>{t('nav.service') || 'Сервис и Тикети'}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Управување со сервисни интервенции, теренски тикети и техничка поддршка.
          </p>
        </div>

        <Link
          href="/service/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Нов Сервисен Тикет
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пребарај по број, клиент, опис или техничар..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
            <p className="text-sm font-bold text-foreground">Нема сервисни тикети</p>
            <p className="text-xs text-muted-foreground">
              Кликнете „Нов Сервисен Тикет“ за да евидентирате нова интервенција.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Тикет</th>
                  <th className="px-4 py-3">Клиент и Дефект</th>
                  <th className="px-4 py-3">Приоритет</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Техничар / Термин</th>
                  <th className="px-4 py-3 text-right">Акции</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary whitespace-nowrap">
                      {st.ticketNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground">
                        {st.customer?.companyName || st.customer?.name || 'Клиент'}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {st.defectDescription}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${priorityBadge(
                          st.priority
                        )}`}
                      >
                        {st.priority === 'URGENT' && <AlertTriangle className="w-3 h-3" />}
                        {st.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${statusBadge(
                          st.status
                        )}`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{st.assignedTechnician?.fullName || 'Недоделен'}</span>
                      </div>
                      {st.scheduledDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(st.scheduledDate)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/service/${st.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold text-[11px]"
                        >
                          Отвори <ArrowUpRight className="w-3 h-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTicketToDelete(st)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                          title="Избриши тикет"
                          aria-label="Избриши тикет"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(ticketToDelete)}
        title="Избриши Сервисен Тикет"
        message={`Дали сте сигурни дека сакате да го избришете тикетот „${ticketToDelete?.ticketNumber || ''}“?`}
        confirmLabel="Да, избриши"
        variant="danger"
        onConfirm={() => {
          if (ticketToDelete) {
            imfexStore.deleteServiceTicket(ticketToDelete.id);
            toast.info('Сервисниот тикет е избришан');
          }
          setTicketToDelete(null);
        }}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );
}
