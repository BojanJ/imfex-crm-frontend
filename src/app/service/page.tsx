'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { imfexStore, useImfexStore } from '@/lib/store';
import { canDeleteRecords, canWriteOperations } from '@/lib/rbac';
import { useServiceTicketsQuery, useDeleteServiceTicketMutation } from '@/lib/queries';
import { ServiceTicket, ServiceStatus } from '@/types';
import { formatDateTime } from '@/lib/date-format';
import { getServiceSlaStatus } from '@/lib/selectors';
import { getServicePriorityLabel, getServiceStatusLabel } from '@/lib/enum-labels';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { toast } from '@/components/ui/toastr';
import {
  PageHeader,
  FilterBar,
  StatusBadge,
  EmptyState,
  BadgeVariant,
} from '@/components/ui/page-primitives';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  Trash2,
  ChevronRight,
} from 'lucide-react';

function priorityVariant(priority: string): BadgeVariant {
  switch (priority) {
    case 'URGENT':
      return 'danger';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'primary';
    default:
      return 'neutral';
  }
}

function statusVariant(status: ServiceStatus): BadgeVariant {
  switch (status) {
    case 'OPEN':
      return 'danger';
    case 'ASSIGNED':
      return 'primary';
    case 'IN_PROGRESS':
      return 'warning';
    case 'COMPLETED':
    case 'CLOSED':
      return 'success';
    default:
      return 'neutral';
  }
}

export default function ServiceDeskPage() {
  const { t, locale } = useI18n();
  useImfexStore();
  const currentRole = imfexStore.getCurrentRole();
  const allowOpsWrite = canWriteOperations(currentRole);
  const allowDelete = canDeleteRecords(currentRole);
  const ticketsQuery = useServiceTicketsQuery();
  const deleteTicketMutation = useDeleteServiceTicketMutation();

  const tickets = ticketsQuery.data ?? imfexStore.getServiceTickets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServiceStatus>('ALL');
  const [ticketToDelete, setTicketToDelete] = useState<ServiceTicket | null>(null);

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

  if (ticketsQuery.isPending && tickets.length === 0) {
    return <PageLoadingSkeleton cards={0} rows={5} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t('nav.service')}
        subtitle={t('service.subtitle')}
        icon={<Wrench className="w-5 h-5" />}
        actions={
          allowOpsWrite ? (
            <Link
              href="/service/new"
              className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('service.new_ticket')}</span>
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('service.search_placeholder')}
      >
        {(['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === st
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {getServiceStatusLabel(st, locale)}
          </button>
        ))}
      </FilterBar>

      {/* Tickets Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title={t('service.empty_title')}
            description={t('service.empty_desc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t('service.col_ticket')}</th>
                  <th className="px-4 py-3">{t('service.col_client_defect')}</th>
                  <th className="px-4 py-3">{t('service.priority')}</th>
                  <th className="px-4 py-3">{t('service.status')}</th>
                  <th className="px-4 py-3">{t('service.col_technician_date')}</th>
                  <th className="px-5 py-3 text-right">{t('service.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-primary whitespace-nowrap">
                      <Link href={`/service/${st.id}`} className="hover:underline">
                        {st.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 max-w-md">
                      <p className="font-medium text-foreground truncate">
                        {st.customer?.companyName || st.customer?.name || t('offers.customer')}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {st.defectDescription}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap space-y-1">
                      <StatusBadge variant={priorityVariant(st.priority)}>
                        {st.priority === 'URGENT' && <AlertTriangle className="w-3 h-3" />}
                        {getServicePriorityLabel(st.priority, locale)}
                      </StatusBadge>
                      {st.status !== 'CLOSED' && st.status !== 'COMPLETED' && (() => {
                        const sla = getServiceSlaStatus(st);
                        return (
                          <span
                            className={`block text-[10px] font-semibold tabular-nums ${
                              sla.breached ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                            }`}
                          >
                            {sla.breached
                              ? `SLA +${Math.round(sla.elapsedHours - sla.targetHours)}h`
                              : `SLA ${Math.max(0, Math.round(sla.remainingHours))}h`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge variant={statusVariant(st.status)} dot>
                        {getServiceStatusLabel(st.status, locale)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-muted-foreground space-y-0.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 shrink-0" />
                        <span>{st.assignedTechnician?.fullName || t('service.unassigned')}</span>
                      </div>
                      {st.scheduledDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="tabular-nums">{formatDateTime(st.scheduledDate)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/service/${st.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium text-xs transition-colors"
                        >
                          {t('service.open')} <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        {allowDelete && (
                          <button
                            type="button"
                            onClick={() => setTicketToDelete(st)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            title={t('service.delete_ticket')}
                            aria-label={t('service.delete_ticket')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
        title={t('service.delete_title')}
        message={`${t('service.delete_confirm_prefix')} „${ticketToDelete?.ticketNumber || ''}“?`}
        confirmLabel={t('service.confirm_delete')}
        variant="danger"
        onConfirm={() => {
          if (ticketToDelete) {
            deleteTicketMutation.mutate(ticketToDelete.id, {
              onSuccess: () => {
                toast.info(t('service.deleted_toast'));
              },
            });
          }
          setTicketToDelete(null);
        }}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );
}
