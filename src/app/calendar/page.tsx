'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';
import { CalendarEvent, CalendarEventType, Customer } from '@/types';
import { imfexStore, useImfexStore } from '@/lib/store';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
  FileText,
  Trash2,
  X,
  Check,
  Tag,
  ExternalLink,
  Sparkles,
  Filter,
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export default function CalendarPage() {
  const { t } = useI18n();
  useImfexStore(); // Auto-subscribe to store updates

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modals state
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('MEETING');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventCustomerId, setEventCustomerId] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(imfexStore.getCustomers());
  }, []);

  const allEvents = useMemo(() => {
    return imfexStore.getCalendarEvents();
  }, [imfexStore.getCalendarEvents().length]);

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return allEvents;
    return allEvents.filter((e) => e.eventType === filterType);
  }, [allEvents, filterType]);

  // Navigation handlers
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

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open modal to add event for specific date
  const handleOpenAddEventModal = (dateStr?: string) => {
    setEditingEventId(null);
    setEventTitle('');
    setEventType('MEETING');
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    setEventStartDate(targetDate);
    setEventEndDate(targetDate);
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEventAllDay(false);
    setEventCustomerId('');
    setEventLocation('');
    setEventDescription('');
    setIsNewEventModalOpen(true);
  };

  // Edit existing custom event
  const handleOpenEditEventModal = (event: CalendarEvent) => {
    if (event.projectId || event.serviceTicketId) return; // Project & Service events auto-managed
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
    setEventLocation(event.location || '');
    setEventDescription(event.description || '');

    setSelectedEvent(null);
    setIsNewEventModalOpen(true);
  };

  // Save new or updated event
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStartDate) return;

    const startIso = eventAllDay ? eventStartDate : `${eventStartDate}T${eventStartTime}`;
    const endIso = eventAllDay ? eventEndDate : `${eventEndDate}T${eventEndTime}`;

    const newEv: CalendarEvent = {
      id: editingEventId || `event-${Date.now()}`,
      title: eventTitle,
      description: eventDescription,
      startDate: startIso,
      endDate: endIso,
      allDay: eventAllDay,
      eventType: eventType,
      customerId: eventCustomerId || undefined,
      customer: eventCustomerId ? imfexStore.getCustomerById(eventCustomerId) : undefined,
      location: eventLocation,
      color: eventType === 'MEETING' ? 'purple' : eventType === 'INSTALLATION' ? 'amber' : 'blue',
      createdAt: new Date().toISOString(),
    };

    imfexStore.saveCalendarEvent(newEv);
    setIsNewEventModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      imfexStore.deleteCalendarEvent(id);
      setSelectedEvent(null);
    }
  };

  // Helpers for Month Grid
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based index (0 = Monday, 6 = Sunday)
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Prev month padding
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ date: prevDate, isCurrentMonth: false, dateStr });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().split('T')[0];
      days.push({ date: curDate, isCurrentMonth: true, dateStr });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ date: nextDate, isCurrentMonth: false, dateStr });
    }

    return days;
  }, [currentDate]);

  // Format Header Title
  const formattedHeaderTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay() === 0 ? 6 : start.getDay() - 1;
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else {
      return 'Agenda Overview';
    }
  }, [currentDate, viewMode]);

  // Color helper for badges
  const getEventBadgeClass = (event: CalendarEvent) => {
    if (event.eventType === 'PROJECT') {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    } else if (event.eventType === 'SERVICE') {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    } else if (event.eventType === 'MEETING') {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    } else if (event.eventType === 'INSTALLATION') {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    } else {
      return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getEventIcon = (event: CalendarEvent) => {
    if (event.eventType === 'PROJECT') return <Briefcase className="w-3 h-3 shrink-0" />;
    if (event.eventType === 'SERVICE') return <Wrench className="w-3 h-3 shrink-0" />;
    if (event.eventType === 'MEETING') return <Users className="w-3 h-3 shrink-0" />;
    return <CalendarIcon className="w-3 h-3 shrink-0" />;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span>{t('nav.calendar')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Unified schedule for commercial projects, field service tickets, and custom events.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddEventModal()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Calendar Controls & Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        {/* Left: Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            Today
          </button>

          <h2 className="font-extrabold text-base text-foreground tracking-tight ml-2">
            {formattedHeaderTitle}
          </h2>
        </div>

        {/* Right: View Mode Tabs & Category Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 border-r border-border pr-3">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PROJECT', label: 'Projects' },
              { id: 'SERVICE', label: 'Service' },
              { id: 'MEETING', label: 'Meetings' },
              { id: 'INSTALLATION', label: 'Installations' },
              { id: 'MAINTENANCE', label: 'Maintenance' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  filterType === f.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border text-xs font-semibold">
            {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  viewMode === v
                    ? 'bg-card text-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2.5 uppercase tracking-wider">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border min-h-[580px]">
            {monthDays.map(({ date, isCurrentMonth, dateStr }, idx) => {
              const dayEvents = filteredEvents.filter((e) => e.startDate.startsWith(dateStr));
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenAddEventModal(dateStr)}
                  className={`p-2 min-h-[100px] flex flex-col transition-colors cursor-pointer group hover:bg-muted/30 ${
                    !isCurrentMonth ? 'bg-muted/10 opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground'
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
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-all"
                      title="Add Event"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Events */}
                  <div className="space-y-1 overflow-y-auto flex-1 max-h-24">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1.5 truncate cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${getEventBadgeClass(
                          ev
                        )}`}
                      >
                        {getEventIcon(ev)}
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] font-bold text-muted-foreground pl-1">
                        +{dayEvents.length - 3} more
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
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <CalendarIcon className="w-4 h-4 text-primary" /> Upcoming Events Agenda
          </h3>

          {filteredEvents.length === 0 ? (
            <p className="text-center py-12 text-xs text-muted-foreground italic">
              No upcoming events found. Click "+ Add Event" to create a new appointment.
            </p>
          ) : (
            <div className="space-y-3 divide-y divide-border">
              {filteredEvents
                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-muted/30 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border ${getEventBadgeClass(ev)}`}>
                        {getEventIcon(ev)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-foreground">{ev.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getEventBadgeClass(
                              ev
                            )}`}
                          >
                            {ev.eventType}
                          </span>
                        </div>

                        {ev.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{ev.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ev.startDate.replace('T', ' ')}
                          </span>
                          {ev.customer && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {ev.customer.companyName || ev.customer.name}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev.projectId && (
                        <Link
                          href={`/projects/${ev.projectId}`}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 flex items-center gap-1"
                        >
                          View Project <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {ev.serviceTicketId && (
                        <Link
                          href={`/service/${ev.serviceTicketId}`}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 flex items-center gap-1"
                        >
                          View Ticket <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* WEEK & DAY VIEWS */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Daily Schedule Timeline
            </h3>
            <span className="text-xs text-muted-foreground font-medium">Standard Business Hours (08:00 - 20:00)</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px] space-y-2">
              {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => {
                const curDateStr = currentDate.toISOString().split('T')[0];
                const matchingEvents = filteredEvents.filter(
                  (e) => e.startDate.startsWith(curDateStr) && (e.startDate.includes(time) || e.allDay)
                );

                return (
                  <div key={time} className="flex items-start gap-4 py-2 border-b border-border/50 text-xs">
                    <span className="font-bold text-muted-foreground w-16 text-right shrink-0">{time}</span>
                    <div className="flex-1 min-h-[40px] bg-muted/20 rounded-lg border border-dashed border-border/60 p-2 flex flex-wrap gap-2">
                      {matchingEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 cursor-pointer shadow-2xs ${getEventBadgeClass(
                            ev
                          )}`}
                        >
                          {getEventIcon(ev)}
                          <span>{ev.title}</span>
                          {ev.allDay && <span className="text-[9px] uppercase font-bold opacity-75">(All Day)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg border ${getEventBadgeClass(selectedEvent)}`}>
                  {getEventIcon(selectedEvent)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground leading-snug">{selectedEvent.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border inline-block mt-0.5 ${getEventBadgeClass(selectedEvent)}`}>
                    {selectedEvent.eventType}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>{selectedEvent.startDate.replace('T', ' ')}</span>
                {selectedEvent.endDate && <span>- {selectedEvent.endDate.replace('T', ' ')}</span>}
              </div>

              {selectedEvent.customer && (
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <span>{selectedEvent.customer.companyName || selectedEvent.customer.name}</span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <span className="font-bold text-[10px] text-muted-foreground uppercase">Description & Notes</span>
                  <p className="text-foreground leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {selectedEvent.projectId && (
                <Link
                  href={`/projects/${selectedEvent.projectId}`}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
                >
                  Go to Project <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              {selectedEvent.serviceTicketId && (
                <Link
                  href={`/service/${selectedEvent.serviceTicketId}`}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1.5"
                >
                  Go to Ticket <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}

              {!selectedEvent.projectId && !selectedEvent.serviceTicketId && (
                <>
                  <button
                    onClick={() => handleOpenEditEventModal(selectedEvent)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground"
                  >
                    Edit Event
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  >
                    Delete Event
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT EVENT MODAL */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {editingEventId ? 'Edit Calendar Appointment' : 'Create New Calendar Appointment'}
              </h3>
              <button
                onClick={() => setIsNewEventModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Site Survey / Installation Meeting"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category / Type</label>
                  <SearchableSelect
                    options={[
                      { value: 'MEETING', label: 'Commercial Meeting' },
                      { value: 'INSTALLATION', label: 'Field Installation' },
                      { value: 'MAINTENANCE', label: 'Inspection / Maintenance' },
                      { value: 'EVENT', label: 'General Task' },
                    ]}
                    value={eventType}
                    onChange={(val) => setEventType(val as CalendarEventType)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Tag Client Account</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: '-- None / Internal --' },
                      ...customers.map((c) => ({
                        value: c.id,
                        label: c.companyName || c.name,
                      })),
                    ]}
                    value={eventCustomerId}
                    onChange={(val) => setEventCustomerId(val)}
                    placeholder="-- Select Client --"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Schedule Timeframe</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={(e) => setEventAllDay(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    All Day Event
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-muted-foreground">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={eventStartDate}
                      onChange={(e) => setEventStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background outline-none font-semibold"
                    />
                  </div>

                  {!eventAllDay && (
                    <div>
                      <label className="block font-semibold mb-1 text-muted-foreground">Start Time</label>
                      <input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background outline-none font-semibold"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Skopje Industrial Park, Bldg 4"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  placeholder="Add meeting agenda or installation instructions..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {editingEventId ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
