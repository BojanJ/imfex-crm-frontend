'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Project, ProjectStatus } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import {
  Briefcase,
  Search,
  User,
  Calendar,
  ChevronRight,
} from 'lucide-react';

export default function ProjectsPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to live store updates

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');

  const refreshList = () => {
    setProjects(imfexStore.getProjects());
  };

  useEffect(() => {
    refreshList();
  }, []);

  useEffect(() => {
    refreshList();
  }, [imfexStore.getProjects().length]);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.projectNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.customer?.companyName || p.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.installationAddress || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses: { key: ProjectStatus; label: string; color: string }[] = [
    { key: 'PLANNED', label: t('projects.planned'), color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { key: 'PROCUREMENT', label: t('projects.in_procurement'), color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { key: 'PRODUCTION', label: t('projects.in_production'), color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    { key: 'INSTALLATION', label: t('projects.scheduled'), color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    { key: 'COMPLETED', label: t('projects.completed'), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { key: 'CLOSED', label: t('projects.closed'), color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <span>{t('projects.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('projects.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs font-bold">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'KANBAN' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              {t('projects.pipeline_board')}
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'TABLE' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              {t('projects.list_view')}
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('projects.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase">{t('offers.filter_status')}</span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            ALL
          </button>
          {statuses.map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === st.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode 1: KANBAN BOARD */}
      {viewMode === 'KANBAN' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {statuses.map((col) => {
            const colProjects = filtered.filter((p) => p.status === col.key);

            return (
              <div key={col.key} className="bg-card/50 border border-border rounded-xl p-3 space-y-3 min-w-[220px]">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded border ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {colProjects.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colProjects.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-border rounded-lg text-[10px] text-muted-foreground">
                      /
                    </div>
                  ) : (
                    colProjects.map((prj) => (
                      <Link
                        key={prj.id}
                        href={`/projects/${prj.id}`}
                        className="block bg-card border border-border hover:border-primary rounded-xl p-3 shadow-xs space-y-2.5 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-primary group-hover:underline">{prj.projectNumber}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {t('offers.offer_number')} {prj.offer?.offerNumber}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-xs text-foreground line-clamp-1">
                            {prj.customer?.companyName || prj.customer?.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {prj.installationAddress || 'Адреса'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-primary" /> {prj.responsibleUser?.fullName || 'Агент'}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-amber-600">
                            <Calendar className="w-3 h-3" /> {prj.targetDeliveryDate || 'TBD'}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode 2: TABLE VIEW */
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="p-4">{t('projects.project_number')}</th>
                  <th className="p-4">{t('offers.customer')}</th>
                  <th className="p-4">{t('projects.responsible')}</th>
                  <th className="p-4">{t('projects.status')}</th>
                  <th className="p-4">{t('projects.target_deadline')}</th>
                  <th className="p-4">{t('projects.installation_address')}</th>
                  <th className="p-4 text-center">{t('offers.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-extrabold text-primary">{p.projectNumber}</td>
                    <td className="p-4 font-bold text-foreground">
                      {p.customer?.companyName || p.customer?.name}
                    </td>
                    <td className="p-4 text-muted-foreground">{p.responsibleUser?.fullName || 'Недоделено'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-amber-600 font-bold">{p.targetDeliveryDate || 'N/A'}</td>
                    <td className="p-4 text-muted-foreground truncate max-w-xs">{p.installationAddress || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/projects/${p.id}`}
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
      )}
    </div>
  );
}
