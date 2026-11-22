'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { CalendarEvent, CalendarEventType } from '@/types';
import { imfexStore } from '@/lib/store';
import {
  useCalendarEventsQuery,
  useCustomersQuery,
  useProjectsQuery,
  useServiceTicketsQuery,
  useSaveCalendarEventMutation,
  useDeleteCalendarEventMutation,
} from '@/lib/queries';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CustomerSelect, ProjectSelect } from '@/components/ui/entity-selectors';
import { formatDate } from '@/lib/date-format';
import { TIME_SLOTS_24H } from '@/lib/formatters';
import { getCalendarEventTypeLabel } from '@/lib/enum-labels';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useEscapeKey } from '@/components/ui/use-escape-key';
import { PageHeader, SectionCard, EmptyState } from '@/components/ui/page-primitives';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  Wrench,
  Users,
  Clock,
  MapPin,
  X,
  ExternalLink,
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

function compactCalendarTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^Project Start:\s*/i, 'Старт: ')
    .replace(/^Target Delivery:\s*/i, 'Рок: ')
    .replace(/^Installation:\s*/i, 'Монтажа: ')
    .replace(/^Service:\s*/i, 'Сервис: ')
    .replace(/\b(?:PRJ|SRV)-\d{4}-(\d+)\b/g, '#$1');
}

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const calendarQuery = useCalendarEventsQuery();
  const customersQuery = useCustomersQuery();
  const projectsQuery = useProjectsQuery();
  const serviceTicketsQuery = useServiceTicketsQuery();
  const saveEventMutation = useSaveCalendarEventMutation();
  const deleteEventMutation = useDeleteCalendarEventMutation();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventIdToDelete, setEventIdToDelete] = useState<string | null>(null);

  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('MEETING');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventCustomerId, setEventCustomerId] = useState('');
  const [eventProjectId, setEventProjectId] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Merge custom CalendarEvents with live Project & Service milestones from TanStack Query caches
  const allEvents = useMemo(() => {
    void calendarQuery.data;
    void projectsQuery.data;
    void serviceTicketsQuery.data;
    void customersQuery.data;
    return imfexStore.getCalendarEvents();
  }, [calendarQuery.data, projectsQuery.data, serviceTicketsQuery.data, customersQuery.data]);
  const filteredEvents =
    filterType === 'ALL' ? allEvents : allEvents.filter((e) => e.eventType === filterType);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'day') d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'day') d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const isSystemAutoEvent = (event: CalendarEvent) =>
    Boolean(event.isSystemEvent || event.id.startsWith('proj-') || event.id.startsWith('serv-event-'));

  const handleOpenAddEventModal = (dateStr?: string) => {
    setEditingEventId(null);
    setEventTitle('');
    setEventType('MEETING');
    const targetDate = dateStr || toLocalDateStr(new Date());
    setEventStartDate(targetDate);
    setEventEndDate(targetDate);
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEventAllDay(false);
    setEventCustomerId('');
    setEventProjectId('');
    setEventLocation('');
    setEventDescription('');
    setIsNewEventModalOpen(true);
  };

  const handleOpenEditEventModal = (event: CalendarEvent) => {
    if (isSystemAutoEvent(event)) return;
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventType(event.eventType);

    const parts = event.startDate.split('T');
    setEventStartDate(parts[0]);
    if (parts[1]) setEventStartTime(parts[1].slice(0, 5));

    if (event.endDate) {
      const endParts = event.endDate.split('T');
      setEventEndDate(endParts[0]);
      if (endParts[1]) setEventEndTime(endParts[1].slice(0, 5));
    } else {
      setEventEndDate(parts[0]);
    }

    setEventAllDay(!!event.allDay);
    setEventCustomerId(event.customerId || '');
    setEventProjectId(event.projectId || '');
    setEventLocation(event.location || '');
    setEventDescription(event.description || '');

    setSelectedEvent(null);
    setIsNewEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStartDate) return;

    const safeEndDate = eventEndDate && eventEndDate >= eventStartDate ? eventEndDate : eventStartDate;
    const startIso = eventAllDay ? eventStartDate : `${eventStartDate}T${eventStartTime}`;
    const endIso = eventAllDay ? safeEndDate : `${safeEndDate}T${eventEndTime}`;

    const newEv: Partial<CalendarEvent> = {
      ...(editingEventId ? { id: editingEventId } : {}),
      title: eventTitle,
      description: eventDescription,
      startDate: startIso,
      endDate: endIso,
      allDay: eventAllDay,
      eventType,
      customerId: eventCustomerId || undefined,
      projectId: eventProjectId || undefined,
      location: eventLocation,
      color: eventType === 'MEETING' ? 'purple' : eventType === 'INSTALLATION' ? 'amber' : 'blue',
    };

    saveEventMutation.mutate(newEv, {
      onSuccess: () => {
        setIsNewEventModalOpen(false);
      },
    });
  };

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date: prevDate, isCurrentMonth: false, dateStr: toLocalDateStr(prevDate) });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const curDate = new Date(year, month, d);
      days.push({ date: curDate, isCurrentMonth: true, dateStr: toLocalDateStr(curDate) });
    }
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ date: nextDate, isCurrentMonth: false, dateStr: toLocalDateStr(nextDate) });
    }
    return days;
  }, [currentDate]);

  const weekdayLabels = useMemo(
    () =>
      locale === 'mk'
        ? ['Пон', 'Вто', 'Сре', 'Чет', 'Пет', 'Саб', 'Нед']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    [locale]
  );

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const offset = start.getDay() === 0 ? 6 : start.getDay() - 1;
    start.setDate(start.getDate() - offset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, label: weekdayLabels[i], dateStr: toLocalDateStr(d) };
    });
  }, [currentDate, weekdayLabels]);

  const formattedHeaderTitle = useMemo(() => {
    if (viewMode === 'month') {
      if (locale === 'mk') {
        const mkMonths = [
          'Јануари',
          'Февруари',
          'Март',
          'Април',
          'Мај',
          'Јуни',
          'Јули',
          'Август',
          'Септември',
          'Октомври',
          'Ноември',
          'Декември',
        ];
        return `${mkMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      }
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay() === 0 ? 6 : start.getDay() - 1;
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${formatDate(start)} — ${formatDate(end)}`;
    }
    if (viewMode === 'day') {
      return formatDate(currentDate);
    }
    return t('calendar.agenda_overview');
  }, [currentDate, viewMode, locale, t]);

  const getEventBadgeClass = (event: CalendarEvent) => {
    if (event.eventType === 'PROJECT') {
      return 'bg-primary/10 text-blue-700 dark:text-blue-400 border-primary/20';
    }
    if (event.eventType === 'SERVICE') {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    }
    if (event.eventType === 'MEETING') {
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    }
    if (event.eventType === 'INSTALLATION') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    }
    return 'bg-muted text-foreground border-border';
  };

  const getEventIcon = (event: CalendarEvent) => {
    if (event.eventType === 'PROJECT') return <Briefcase className="w-3 h-3 shrink-0" />;
    if (event.eventType === 'SERVICE') return <Wrench className="w-3 h-3 shrink-0" />;
    if (event.eventType === 'MEETING') return <Users className="w-3 h-3 shrink-0" />;
    return <CalendarIcon className="w-3 h-3 shrink-0" />;
  };

  const todayStr = toLocalDateStr(new Date());

  useEscapeKey(Boolean(selectedEvent) && !eventIdToDelete, () => setSelectedEvent(null));
  useEscapeKey(isNewEventModalOpen, () => setIsNewEventModalOpen(false));

  const inputClass =
    'w-full h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={t('nav.calendar')}
        subtitle={t('calendar.subtitle')}
        icon={<CalendarIcon className="w-5 h-5" />}
        actions={
          <button
            type="button"
            onClick={() => handleOpenAddEventModal()}
            className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('calendar.add_event')}</span>
          </button>
        }
      />

      {/* Clean 2-Tier Calendar Toolbar */}
      <div className="surface-card rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Navigation & Period Title */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-background overflow-hidden">
              <button
                type="button"
                onClick={handlePrev}
                className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Претходен"
                aria-label="Претходен период"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="h-8 px-3 text-xs font-medium border-x border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {t('calendar.today')}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Следен"
                aria-label="Следен период"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="font-semibold text-sm sm:text-base text-foreground capitalize pl-1">
              {formattedHeaderTitle}
            </h2>
          </div>

          {/* Segmented View Switcher */}
          <div className="inline-flex items-center bg-muted/70 p-0.5 rounded-lg border border-border text-xs">
            {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === v
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`calendar.${v}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-border/60">
          {(['ALL', 'PROJECT', 'SERVICE', 'MEETING', 'INSTALLATION', 'MAINTENANCE'] as const).map(
            (fid) => (
              <button
                key={fid}
                type="button"
                onClick={() => setFilterType(fid)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filterType === fid
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {getCalendarEventTypeLabel(fid, locale)}
              </button>
            )
          )}
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="surface-card rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-medium text-muted-foreground py-2.5">
            {weekdayLabels.map((lbl) => (
              <span key={lbl}>{lbl}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/70 min-h-[560px]">
            {monthDays.map(({ date, isCurrentMonth, dateStr }, idx) => {
              const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(dateStr));
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenAddEventModal(dateStr)}
                  className={`p-2 min-h-[104px] flex flex-col transition-colors cursor-pointer group hover:bg-muted/25 ${
                    !isCurrentMonth ? 'bg-muted/15 text-muted-foreground/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center tabular-nums ${
                        isToday
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddEventModal(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-opacity cursor-pointer"
                      title={t('calendar.add_event')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 overflow-y-auto flex-1 max-h-24">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 truncate cursor-pointer transition-opacity hover:opacity-90 ${getEventBadgeClass(
                          ev
                        )}`}
                      >
                        {getEventIcon(ev)}
                        <span className="truncate">{compactCalendarTitle(ev.title)}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] font-medium text-muted-foreground pl-1">
                        +{dayEvents.length - 3} {locale === 'mk' ? 'повеќе' : 'more'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <SectionCard
          title={t('calendar.agenda_overview')}
          icon={<CalendarIcon className="w-4 h-4" />}
          noPadding
        >
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="w-5 h-5" />}
              title={locale === 'mk' ? 'Нема закажани настани' : 'No upcoming events'}
              description={
                locale === 'mk'
                  ? 'Кликнете „Додај Настан“ за да креирате нов термин.'
                  : 'Click "Add Event" to create a new appointment.'
              }
            />
          ) : (
            <div className="divide-y divide-border/70">
              {[...filteredEvents]
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg border shrink-0 ${getEventBadgeClass(ev)}`}>
                        {getEventIcon(ev)}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{ev.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getEventBadgeClass(
                              ev
                            )}`}
                          >
                            {getCalendarEventTypeLabel(ev.eventType, locale)}
                          </span>
                        </div>

                        {ev.description && (
                          <p className="text-muted-foreground line-clamp-1">{ev.description}</p>
                        )}

                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3" />
                            {formatDate(ev.startDate)}
                            {ev.startDate.includes('T') ? ` ${ev.startDate.split('T')[1].slice(0, 5)}` : ''}
                          </span>
                          {ev.customer && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {ev.customer.companyName || ev.customer.name}
                            </span>
                          )}
                          {ev.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {ev.projectId && (
                        <Link
                          href={`/projects/${ev.projectId}`}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1"
                        >
                          {locale === 'mk' ? 'Проект' : 'Project'}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      )}
                      {ev.serviceTicketId && (
                        <Link
                          href={`/service/${ev.serviceTicketId}`}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-1"
                        >
                          {locale === 'mk' ? 'Тикет' : 'Ticket'}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="surface-card rounded-xl overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {weekDays.map(({ date, label, dateStr }) => {
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={dateStr}
                    className={`p-3 text-center border-r last:border-r-0 border-border/70 ${
                      isToday ? 'bg-primary/10' : ''
                    }`}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                    <p
                      className={`text-xs font-semibold mt-0.5 tabular-nums ${
                        isToday ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {formatDate(date)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 divide-x divide-border/70 min-h-[420px]">
              {weekDays.map(({ dateStr }) => {
                const dayEvents = [...filteredEvents]
                  .filter((e) => e.startDate.startsWith(dateStr))
                  .sort((a, b) => a.startDate.localeCompare(b.startDate));
                return (
                  <div
                    key={dateStr}
                    onClick={() => handleOpenAddEventModal(dateStr)}
                    className="p-2.5 flex flex-col gap-2 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddEventModal(dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-opacity cursor-pointer"
                        title={t('calendar.add_event')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {dayEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground/40 text-center py-6">—</p>
                    ) : (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          title={ev.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className={`p-2 rounded-lg text-[11px] font-medium border space-y-1 cursor-pointer hover:opacity-90 ${getEventBadgeClass(
                            ev
                          )}`}
                        >
                          <div className="flex items-center gap-1.5">
                            {getEventIcon(ev)}
                            <span className="truncate font-semibold">{compactCalendarTitle(ev.title)}</span>
                          </div>
                          <p className="text-[10px] opacity-80 tabular-nums">
                            {ev.allDay
                              ? t('calendar.all_day')
                              : ev.startDate.includes('T')
                              ? ev.startDate.split('T')[1].slice(0, 5)
                              : t('calendar.all_day')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <SectionCard
          title={locale === 'mk' ? 'Дневен распоред' : 'Daily Schedule'}
          subtitle="08:00 — 20:00"
          icon={<Clock className="w-4 h-4" />}
        >
          <div className="overflow-x-auto">
            <div className="min-w-[540px] divide-y divide-border/60">
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(
                (time) => {
                  const curDateStr = toLocalDateStr(currentDate);
                  const matchingEvents = filteredEvents.filter(
                    (e) => e.startDate.startsWith(curDateStr) && (e.startDate.includes(time) || e.allDay)
                  );

                  return (
                    <div key={time} className="flex items-start gap-4 py-2.5 text-xs">
                      <span className="font-mono text-[11px] text-muted-foreground w-14 text-right pt-1 shrink-0">
                        {time}
                      </span>
                      <div className="flex-1 min-h-[36px] bg-muted/20 rounded-lg border border-dashed border-border/60 p-1.5 flex flex-wrap gap-2">
                        {matchingEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 cursor-pointer ${getEventBadgeClass(
                              ev
                            )}`}
                          >
                            {getEventIcon(ev)}
                            <span>{ev.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedEvent.title}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg border shrink-0 ${getEventBadgeClass(selectedEvent)}`}>
                  {getEventIcon(selectedEvent)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground leading-snug">
                    {selectedEvent.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border inline-block mt-1 ${getEventBadgeClass(
                      selectedEvent
                    )}`}
                  >
                    {getCalendarEventTypeLabel(selectedEvent.eventType, locale)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
                aria-label="Затвори"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium tabular-nums">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>
                  {formatDate(selectedEvent.startDate)}
                  {selectedEvent.startDate.includes('T')
                    ? ` ${selectedEvent.startDate.split('T')[1].slice(0, 5)}`
                    : ''}
                </span>
                {selectedEvent.endDate && (
                  <span>
                    — {formatDate(selectedEvent.endDate)}
                    {selectedEvent.endDate.includes('T')
                      ? ` ${selectedEvent.endDate.split('T')[1].slice(0, 5)}`
                      : ''}
                  </span>
                )}
              </div>

              {selectedEvent.customer && (
                <div className="flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{selectedEvent.customer.companyName || selectedEvent.customer.name}</span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                  <span className="font-medium text-[11px] text-muted-foreground">
                    {t('calendar.notes')}
                  </span>
                  <p className="text-foreground leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              {selectedEvent.projectId && (
                <Link
                  href={`/projects/${selectedEvent.projectId}`}
                  className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5"
                >
                  <span>{locale === 'mk' ? 'Отвори Проект' : 'Open Project'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              {selectedEvent.serviceTicketId && (
                <Link
                  href={`/service/${selectedEvent.serviceTicketId}`}
                  className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5"
                >
                  <span>{locale === 'mk' ? 'Отвори Тикет' : 'Open Ticket'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              {!isSystemAutoEvent(selectedEvent) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenEditEventModal(selectedEvent)}
                    className="h-9 px-3 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground cursor-pointer"
                  >
                    {locale === 'mk' ? 'Уреди' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventIdToDelete(selectedEvent.id)}
                    className="h-9 px-3 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                  >
                    {locale === 'mk' ? 'Избриши' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT EVENT MODAL */}
      {isNewEventModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsNewEventModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editingEventId ? 'Уреди настан' : 'Нов настан'}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>{editingEventId ? t('calendar.modal_edit') : t('calendar.modal_create')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewEventModalOpen(false)}
                aria-label={t('calendar.cancel')}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('calendar.event_title')}</label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'mk' ? 'пр. Теренски увид / Монтажа' : 'e.g. Site Survey'}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-medium text-muted-foreground">{t('calendar.category_type')}</label>
                  <SearchableSelect
                    options={[
                      { value: 'MEETING', label: getCalendarEventTypeLabel('MEETING', locale) },
                      { value: 'INSTALLATION', label: getCalendarEventTypeLabel('INSTALLATION', locale) },
                      { value: 'MAINTENANCE', label: getCalendarEventTypeLabel('MAINTENANCE', locale) },
                      { value: 'EVENT', label: getCalendarEventTypeLabel('EVENT', locale) },
                    ]}
                    value={eventType}
                    onChange={(val) => setEventType(val as CalendarEventType)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-muted-foreground">{t('calendar.tag_client')}</label>
                  <CustomerSelect
                    value={eventCustomerId}
                    onChange={(val) => setEventCustomerId(val)}
                    placeholder={locale === 'mk' ? '-- Избери Клиент --' : '-- Select Client --'}
                    allowClear
                    clearLabel={locale === 'mk' ? '-- Без Клиент --' : '-- None --'}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('calendar.link_project')}</label>
                <ProjectSelect
                  value={eventProjectId}
                  onChange={(val, prj) => {
                    setEventProjectId(val);
                    if (prj?.customerId && !eventCustomerId) {
                      setEventCustomerId(prj.customerId);
                    }
                  }}
                  placeholder={locale === 'mk' ? '-- Пребарај проект --' : '-- Search project --'}
                  allowClear
                  clearLabel={locale === 'mk' ? '-- Без поврзан проект --' : '-- None --'}
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">
                    {t('calendar.schedule_timeframe')}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={(e) => setEventAllDay(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span>{t('calendar.all_day')}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-medium text-muted-foreground">{t('calendar.start_date')}</label>
                    <input
                      type="date"
                      required
                      value={eventStartDate}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        setEventStartDate(nextStart);
                        if (!eventEndDate || eventEndDate < nextStart) {
                          setEventEndDate(nextStart);
                        }
                      }}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-medium text-muted-foreground">{t('calendar.end_date')}</label>
                    <input
                      type="date"
                      min={eventStartDate}
                      value={eventEndDate}
                      onChange={(e) => setEventEndDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {!eventAllDay && (
                    <>
                      <div className="space-y-1">
                        <label className="block font-medium text-muted-foreground">{t('calendar.start_time')}</label>
                        <select
                          value={TIME_SLOTS_24H.includes(eventStartTime) ? eventStartTime : '09:00'}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          className={`${inputClass} font-mono`}
                        >
                          {!TIME_SLOTS_24H.includes(eventStartTime) && eventStartTime && (
                            <option value={eventStartTime}>{eventStartTime}</option>
                          )}
                          {TIME_SLOTS_24H.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-muted-foreground">{t('calendar.end_time')}</label>
                        <select
                          value={TIME_SLOTS_24H.includes(eventEndTime) ? eventEndTime : '10:00'}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          className={`${inputClass} font-mono`}
                        >
                          {!TIME_SLOTS_24H.includes(eventEndTime) && eventEndTime && (
                            <option value={eventEndTime}>{eventEndTime}</option>
                          )}
                          {TIME_SLOTS_24H.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('calendar.location')}</label>
                <input
                  type="text"
                  placeholder={locale === 'mk' ? 'пр. Индустриска Зона Скопје' : 'e.g. Skopje Industrial Park'}
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('calendar.notes')}</label>
                <textarea
                  rows={3}
                  placeholder={locale === 'mk' ? 'Додадете забелешки или инструкции...' : 'Add notes...'}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="h-9 px-4 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  {t('calendar.cancel')}
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  {editingEventId ? t('calendar.save_changes') : t('calendar.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(eventIdToDelete)}
        title="Избриши Настан"
        message="Дали сте сигурни дека сакате да го избришете овој календарски настан?"
        confirmLabel="Да, избриши"
        variant="danger"
        onConfirm={() => {
          if (eventIdToDelete) {
            deleteEventMutation.mutate(eventIdToDelete, {
              onSuccess: () => {
                setSelectedEvent(null);
              },
            });
          }
          setEventIdToDelete(null);
        }}
        onCancel={() => setEventIdToDelete(null)}
      />
    </div>
  );
}
