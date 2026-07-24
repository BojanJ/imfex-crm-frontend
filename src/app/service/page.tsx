'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { ServiceTicket } from '@/types';
import { imfexStore } from '@/lib/store';
import {
  Wrench,
  Plus,
  Search,
  ChevronRight,
} from 'lucide-react';

export default function ServicePage() {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const refreshList = () => {
    setTickets(imfexStore.getServiceTickets());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer?.companyName || t.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      t.defectDescription.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <span>{t('service.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('service.subtitle')}
          </p>
        </div>

        <Link
          href="/service/new"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> {t('service.new_ticket')}
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('service.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-muted-foreground uppercase">{t('service.priority_filter')}</span>
            {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-all ${
                  priorityFilter === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-muted-foreground uppercase">{t('service.status_filter')}</span>
            {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-all ${
                  statusFilter === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Service Tickets Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
            <tr>
              <th className="p-4">{t('service.ticket_number')}</th>
              <th className="p-4">{t('offers.customer')}</th>
              <th className="p-4">{t('service.defect')}</th>
              <th className="p-4">{t('service.priority')}</th>
              <th className="p-4">{t('service.status')}</th>
              <th className="p-4">{t('service.technician')}</th>
              <th className="p-4">{t('service.scheduled_date')}</th>
              <th className="p-4 text-center">{t('offers.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-4 font-extrabold text-primary">{ticket.ticketNumber}</td>
                <td className="p-4">
                  <p className="font-bold text-foreground">
                    {ticket.customer?.companyName || ticket.customer?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{ticket.installedItem?.title || 'Опрема'}</p>
                </td>
                <td className="p-4 max-w-xs truncate text-foreground font-medium">
                  {ticket.defectDescription}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      ticket.priority === 'URGENT'
                        ? 'bg-red-500/10 text-red-600 animate-pulse'
                        : ticket.priority === 'HIGH'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-blue-500/10 text-blue-600'
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-muted text-foreground">
                    {ticket.status}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground">
                  {ticket.assignedTechnician?.fullName || 'Недоделен'}
                </td>
                <td className="p-4 font-bold text-foreground">
                  {ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleString() : 'Не е закажано'}
                </td>
                <td className="p-4 text-center">
                  <Link
                    href={`/service/${ticket.id}`}
                    className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-1"
                  >
                    {t('projects.manage')} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
