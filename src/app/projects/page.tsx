'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Project, ProjectStatus } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from '@/components/ui/toastr';
import {
  Briefcase,
  Search,
  User,
  Calendar,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

export default function ProjectsPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to live store updates

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');

  // Drag and Drop states
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);

  // Confirm Modal state for status change
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    project: Project;
    newStatus: ProjectStatus;
  } | null>(null);

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

  const getStatusLabel = (st: ProjectStatus) =>
    statuses.find((s) => s.key === st)?.label || st;

  const requestProjectStatusChange = (prj: Project, targetStatus: ProjectStatus) => {
    if (prj.status === targetStatus) return;
    setPendingStatusChange({ project: prj, newStatus: targetStatus });
  };

  const confirmProjectStatusChange = () => {
    if (!pendingStatusChange) return;
    const { project, newStatus } = pendingStatusChange;
    imfexStore.saveProject({
      ...project,
      status: newStatus,
    });
    refreshList();
    toast.success(
      'Статусот на проектот е променет!',
      `Проектот ${project.projectNumber} е префрлен во статус „${getStatusLabel(newStatus)}“.`
    );
    setPendingStatusChange(null);
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.setData('text/plain', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverStatus(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, statusKey: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== statusKey) {
      setDragOverStatus(statusKey);
    }
  };

  const handleDropOnStatus = (e: React.DragEvent, targetStatus: ProjectStatus) => {
    e.preventDefault();
    const pId = e.dataTransfer.getData('text/plain') || draggedProjectId;
    setDraggedProjectId(null);
    setDragOverStatus(null);
    if (!pId) return;
    const prj = projects.find((p) => p.id === pId);
    if (!prj || prj.status === targetStatus) return;
    requestProjectStatusChange(prj, targetStatus);
  };

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

      {/* View Mode 1: KANBAN BOARD (Drag & Drop Process Table) */}
      {viewMode === 'KANBAN' ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground px-1">
            Повлечете (Drag & Drop) картичка на проект во друга колона на процесот за да го промените неговиот статус.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
            {statuses.map((col) => {
              const colProjects = filtered.filter((p) => p.status === col.key);
              const isDropTarget = dragOverStatus === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOverColumn(e, col.key)}
                  onDragLeave={() => {
                    if (dragOverStatus === col.key) setDragOverStatus(null);
                  }}
                  onDrop={(e) => handleDropOnStatus(e, col.key)}
                  className={`border rounded-xl p-3 space-y-3 min-w-[220px] transition-all ${
                    isDropTarget
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/40 shadow-md'
                      : 'bg-card/50 border-border'
                  }`}
                >
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
                      <div
                        className={`p-6 text-center border border-dashed rounded-lg text-[10px] transition-colors ${
                          isDropTarget
                            ? 'border-primary text-primary font-bold bg-primary/5'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {isDropTarget ? 'Пушти тука за промена на статус' : '/'}
                      </div>
                    ) : (
                      colProjects.map((prj) => {
                        const isDragging = draggedProjectId === prj.id;
                        return (
                          <div
                            key={prj.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, prj.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-card border hover:border-primary rounded-xl p-3 shadow-xs space-y-2.5 transition-all group cursor-grab active:cursor-grabbing ${
                              isDragging
                                ? 'opacity-40 scale-95 border-primary border-dashed'
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary shrink-0" />
                                <Link
                                  href={`/projects/${prj.id}`}
                                  className="font-black text-primary hover:underline"
                                >
                                  {prj.projectNumber}
                                </Link>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {t('offers.offer_number')} {prj.offer?.offerNumber}
                              </span>
                            </div>

                            <Link href={`/projects/${prj.id}`} className="block">
                              <p className="font-bold text-xs text-foreground line-clamp-1">
                                {prj.customer?.companyName || prj.customer?.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {prj.installationAddress || 'Адреса'}
                              </p>
                            </Link>

                            <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-primary" /> {prj.responsibleUser?.fullName || 'Агент'}
                              </span>
                              <span className="flex items-center gap-1 font-bold text-amber-600">
                                <Calendar className="w-3 h-3" /> {prj.targetDeliveryDate || 'TBD'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* View Mode 2: TABLE VIEW with Drag & Drop Process Status Zones */
        <div className="space-y-4">
          {/* Process Drop Zones Bar for Table View */}
          <div className="bg-card border border-border rounded-xl p-3.5 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Табела на Процес — Повлечи ред од табелата врз статус за промена (Drag & Drop):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {statuses.map((st) => {
                const count = filtered.filter((p) => p.status === st.key).length;
                const isOver = dragOverStatus === st.key;
                return (
                  <div
                    key={st.key}
                    onDragOver={(e) => handleDragOverColumn(e, st.key)}
                    onDragLeave={() => {
                      if (dragOverStatus === st.key) setDragOverStatus(null);
                    }}
                    onDrop={(e) => handleDropOnStatus(e, st.key)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isOver
                        ? 'border-primary bg-primary/15 ring-2 ring-primary/40 scale-[1.02]'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="text-xs font-black text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[850px]">
                <thead className="bg-muted/50 font-bold border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-4 w-10"></th>
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
                  {filtered.map((p) => {
                    const isDragging = draggedProjectId === p.id;
                    return (
                      <tr
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOverColumn(e, p.status)}
                        onDrop={(e) => handleDropOnStatus(e, p.status)}
                        className={`hover:bg-muted/20 transition-colors cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 bg-primary/5' : ''
                        }`}
                      >
                        <td className="p-4 text-muted-foreground">
                          <GripVertical className="w-4 h-4 text-muted-foreground/70 hover:text-primary" />
                        </td>
                        <td className="p-4 font-extrabold text-primary">{p.projectNumber}</td>
                        <td className="p-4 font-bold text-foreground">
                          {p.customer?.companyName || p.customer?.name}
                        </td>
                        <td className="p-4 text-muted-foreground">{p.responsibleUser?.fullName || 'Недоделено'}</td>
                        <td className="p-4">
                          <select
                            value={p.status}
                            onChange={(e) => requestProjectStatusChange(p, e.target.value as ProjectStatus)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 outline-none cursor-pointer"
                          >
                            {statuses.map((st) => (
                              <option key={st.key} value={st.key} className="bg-card text-foreground">
                                {st.label}
                              </option>
                            ))}
                          </select>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingStatusChange)}
        title="Потврда за Промена на Статус на Проект"
        message={
          pendingStatusChange
            ? `Дали сте сигурни дека сакате да го промените статусот на проектот „${
                pendingStatusChange.project.projectNumber
              }“ (${
                pendingStatusChange.project.customer?.companyName ||
                pendingStatusChange.project.customer?.name ||
                'Клиент'
              }) од „${getStatusLabel(pendingStatusChange.project.status)}“ во „${getStatusLabel(
                pendingStatusChange.newStatus
              )}“?`
            : ''
        }
        variant="warning"
        confirmLabel="Потврди Промена"
        onConfirm={confirmProjectStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}
