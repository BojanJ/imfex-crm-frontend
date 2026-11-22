'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { Project, ProjectStatus } from '@/types';
import { imfexStore } from '@/lib/store';
import { useProjectsQuery, useSaveProjectMutation } from '@/lib/queries';
import { formatDate } from '@/lib/date-format';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { toast } from '@/components/ui/toastr';
import {
  PageHeader,
  FilterBar,
  StatusBadge,
  BadgeVariant,
} from '@/components/ui/page-primitives';
import {
  Briefcase,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Kanban,
  List,
} from 'lucide-react';

export default function ProjectsPage() {
  const { t, locale } = useI18n();
  const projectsQuery = useProjectsQuery();
  const saveProjectMutation = useSaveProjectMutation();

  const projects = projectsQuery.data ?? imfexStore.getProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('TABLE');
    }
  }, []);

  const scrollKanban = (direction: 'left' | 'right') => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -260 : 260;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);

  const [pendingStatusChange, setPendingStatusChange] = useState<{
    project: Project;
    newStatus: ProjectStatus;
  } | null>(null);

  const filtered = projects.filter((p) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.projectNumber.toLowerCase().includes(term) ||
      (p.customer?.companyName || p.customer?.name || '').toLowerCase().includes(term) ||
      (p.customer?.taxId || '').toLowerCase().includes(term) ||
      (p.customer?.city || '').toLowerCase().includes(term) ||
      (p.customer?.phone || '').toLowerCase().includes(term) ||
      (p.offer?.offerNumber || '').toLowerCase().includes(term) ||
      (p.responsibleUser?.fullName || '').toLowerCase().includes(term) ||
      (p.installationAddress || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses: { key: ProjectStatus; label: string; variant: BadgeVariant }[] = [
    { key: 'PLANNED', label: t('projects.planned'), variant: 'primary' },
    { key: 'PROCUREMENT', label: t('projects.in_procurement'), variant: 'purple' },
    { key: 'PRODUCTION', label: t('projects.in_production'), variant: 'warning' },
    { key: 'INSTALLATION', label: t('projects.scheduled'), variant: 'warning' },
    { key: 'COMPLETED', label: t('projects.completed'), variant: 'success' },
    { key: 'CLOSED', label: t('projects.closed'), variant: 'neutral' },
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
    saveProjectMutation.mutate(
      {
        ...project,
        status: newStatus,
      },
      {
        onSuccess: () => {
          toast.success(
            'Статусот на проектот е променет!',
            `Проектот ${project.projectNumber} е префрлен во статус „${getStatusLabel(newStatus)}“.`
          );
        },
      }
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

  if (!imfexStore.isLoadedFromBackend) {
    return <PageLoadingSkeleton cards={0} rows={6} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        icon={<Briefcase className="w-5 h-5" />}
        actions={
          <div className="inline-flex items-center bg-muted/80 p-0.5 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'KANBAN'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>{t('projects.pipeline_board')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t('projects.list_view')}</span>
            </button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('projects.search_placeholder')}
      >
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {locale === 'mk' ? 'Сите' : 'All'}
        </button>
        {statuses.map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setStatusFilter(st.key)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              statusFilter === st.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {st.label}
          </button>
        ))}
      </FilterBar>

      {/* View Mode 1: Minimal Kanban Board */}
      {viewMode === 'KANBAN' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] text-muted-foreground">
              {t('projects.kanban_hint')}
            </p>
            <div className="inline-flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => scrollKanban('left')}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label={t('projects.scroll_left')}
                title={t('projects.scroll_left')}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollKanban('right')}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label={t('projects.scroll_right')}
                title={t('projects.scroll_right')}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div
            ref={kanbanScrollRef}
            className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1"
          >
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
                  className={`snap-start rounded-xl border p-3 space-y-3 w-[232px] shrink-0 transition-colors ${
                    isDropTarget
                      ? 'bg-primary/5 border-primary ring-1 ring-primary/30'
                      : 'bg-muted/25 border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70">
                    <StatusBadge variant={col.variant} dot className="truncate max-w-[170px]">
                      {col.label}
                    </StatusBadge>
                    <span className="text-[11px] font-semibold text-muted-foreground tabular-nums px-1.5">
                      {colProjects.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 min-h-[120px]">
                    {colProjects.length === 0 ? (
                      <div
                        className={`py-6 px-3 text-center border border-dashed rounded-lg text-[11px] transition-colors ${
                          isDropTarget
                            ? 'border-primary text-primary font-medium bg-primary/5'
                            : 'border-border/70 text-muted-foreground/70'
                        }`}
                      >
                        {isDropTarget ? t('projects.drop_here') : t('projects.no_projects')}
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
                            className={`surface-card rounded-lg p-3 space-y-2 transition-all group cursor-grab active:cursor-grabbing hover:border-primary/50 ${
                              isDragging ? 'opacity-40 border-primary border-dashed' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-1 min-w-0">
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0" />
                                <Link
                                  href={`/projects/${prj.id}`}
                                  className="font-mono font-semibold text-primary hover:underline truncate"
                                >
                                  {prj.projectNumber}
                                </Link>
                              </div>
                              {prj.offer?.offerNumber && (
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                  {prj.offer.offerNumber}
                                </span>
                              )}
                            </div>

                            <Link href={`/projects/${prj.id}`} className="block space-y-0.5">
                              <p className="font-medium text-xs text-foreground line-clamp-1">
                                {prj.customer?.companyName || prj.customer?.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {prj.installationAddress || '—'}
                              </p>
                            </Link>

                            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{prj.responsibleUser?.fullName || '—'}</span>
                              </span>
                              <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 shrink-0 tabular-nums">
                                <Calendar className="w-3 h-3" />
                                {formatDate(prj.targetDeliveryDate, '—')}
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
        /* View Mode 2: Table View with Process Drop Zones */
        <div className="space-y-4">
          <div className="surface-card rounded-xl p-3.5 space-y-2.5 hidden md:block">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t('projects.table_drag_hint')}
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
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1 transition-colors ${
                      isOver
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/80 bg-muted/25'
                    }`}
                  >
                    <StatusBadge variant={st.variant} className="truncate">
                      {st.label}
                    </StatusBadge>
                    <span className="text-xs font-semibold text-foreground tabular-nums pr-1">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="surface-card rounded-xl overflow-hidden text-xs">
            {/* Mobile Stacked Cards */}
            <div className="divide-y divide-border md:hidden">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">{t('projects.no_projects_found')}</div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-mono font-semibold text-primary hover:underline block"
                        >
                          {p.projectNumber}
                        </Link>
                        <p className="font-medium text-foreground truncate">
                          {p.customer?.companyName || p.customer?.name}
                        </p>
                      </div>
                      <select
                        value={p.status}
                        onChange={(e) =>
                          requestProjectStatusChange(p, e.target.value as ProjectStatus)
                        }
                        aria-label={`Статус за ${p.projectNumber}`}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-background text-foreground border border-border outline-none focus:border-primary cursor-pointer shrink-0"
                      >
                        {statuses.map((st) => (
                          <option key={st.key} value={st.key} className="bg-card text-foreground">
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        <span>{p.responsibleUser?.fullName || t('projects.unassigned')}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium tabular-nums">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(p.targetDeliveryDate, '—')}</span>
                      </span>
                    </div>
                    {p.installationAddress && (
                      <p className="text-[11px] text-muted-foreground truncate">{p.installationAddress}</p>
                    )}
                    <div className="pt-2 border-t border-border/60 flex justify-end">
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border bg-background hover:bg-muted text-foreground font-medium rounded-lg text-xs transition-colors"
                      >
                        {t('projects.manage')} <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 w-8"></th>
                    <th className="px-4 py-3 whitespace-nowrap">{t('projects.project_number')}</th>
                    <th className="px-4 py-3">{t('offers.customer')}</th>
                    <th className="px-4 py-3">{t('projects.responsible')}</th>
                    <th className="px-4 py-3">{t('projects.status')}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t('projects.target_deadline')}</th>
                    <th className="px-4 py-3">{t('projects.installation_address')}</th>
                    <th className="px-4 py-3 text-right">{t('offers.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
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
                        className={`hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-3 py-3.5 text-muted-foreground">
                          <GripVertical className="w-4 h-4 text-muted-foreground/60 hover:text-primary" />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold text-primary whitespace-nowrap">
                          <Link href={`/projects/${p.id}`} className="hover:underline">
                            {p.projectNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {p.customer?.companyName || p.customer?.name}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {p.responsibleUser?.fullName || t('projects.unassigned')}
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={p.status}
                            onChange={(e) =>
                              requestProjectStatusChange(p, e.target.value as ProjectStatus)
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-background text-foreground border border-border outline-none focus:border-primary cursor-pointer"
                          >
                            {statuses.map((st) => (
                              <option key={st.key} value={st.key} className="bg-card text-foreground">
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-amber-700 dark:text-amber-400 font-medium tabular-nums whitespace-nowrap">
                          {formatDate(p.targetDeliveryDate, '—')}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground truncate max-w-[200px]">
                          {p.installationAddress || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`/projects/${p.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border bg-background hover:bg-muted text-foreground font-medium rounded-lg text-xs transition-colors"
                          >
                            {t('projects.manage')} <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
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
