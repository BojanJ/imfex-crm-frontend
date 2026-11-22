'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import {
  formatDate,
  parseDDMMYYYYToIso,
  splitIsoDateTime,
  toDateInputValue,
  toLocalDateIso,
} from '@/lib/date-format';
import { TIME_SLOTS_24H } from '@/lib/formatters';

const MK_MONTHS = [
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

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MK_WEEKDAYS = ['Пон', 'Вто', 'Сре', 'Чет', 'Пет', 'Саб', 'Нед'];
const EN_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isoToYearMonth(iso: string): { year: number; month: number } {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]) - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function autoFormatDateTyping(raw: string, prev: string): string {
  // If user is deleting characters, don't fight them with extra slashes
  if (raw.length < prev.length) {
    return raw.replace(/[^\d/.-]/g, '').slice(0, 10);
  }
  const normalized = raw.replace(/[.-]/g, '/').replace(/[^\d/]/g, '');
  // If user pasted or typed slashes already, keep clean digits + up to 2 slashes
  if (normalized.includes('/')) {
    return normalized.slice(0, 10);
  }
  const digits = normalized.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export interface DatePickerProps {
  /** ISO date string 'YYYY-MM-DD' (or empty string '') */
  value: string;
  /** Called with ISO 'YYYY-MM-DD' or '' */
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  allowClear?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = 'dd/mm/yyyy',
  className = '',
  id,
  ariaLabel,
  allowClear,
}) => {
  const { locale } = useI18n();
  const normalizedIso = toDateInputValue(value);
  const formattedDisplay = normalizedIso ? formatDate(normalizedIso) : '';

  const [textValue, setTextValue] = useState(formattedDisplay);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState(() => isoToYearMonth(normalizedIso));
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep text display synced with external value changes
  useEffect(() => {
    setTextValue(formattedDisplay);
    if (normalizedIso) {
      setView(isoToYearMonth(normalizedIso));
    }
  }, [formattedDisplay, normalizedIso]);

  const minIso = min ? toDateInputValue(min) : '';
  const maxIso = max ? toDateInputValue(max) : '';
  const canClear = allowClear ?? !required;

  const isDateDisabled = (iso: string) => {
    if (minIso && iso < minIso) return true;
    if (maxIso && iso > maxIso) return true;
    return false;
  };

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  // Fixed popover positioning anchored to input wrapper
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popWidth = 272;
      const popHeight = 310;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < popHeight && rect.top > popHeight;
      const maxLeft = window.innerWidth - popWidth - 12;
      const left = Math.max(12, Math.min(rect.left, maxLeft));
      const top = showAbove ? Math.max(12, rect.top - popHeight - 4) : rect.bottom + 4;
      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(view.year, view.month, 1);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells: { day: number; iso: string; inMonth: boolean }[] = [];

    const prevMonthLast = new Date(view.year, view.month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(view.year, view.month - 1, prevMonthLast - i);
      cells.push({ day: d.getDate(), iso: toLocalDateIso(d), inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(view.year, view.month, d);
      cells.push({ day: d, iso: toLocalDateIso(dateObj), inMonth: true });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(view.year, view.month + 1, d);
      cells.push({ day: d, iso: toLocalDateIso(dateObj), inMonth: false });
    }

    return cells;
  }, [view.year, view.month]);

  const todayIso = toLocalDateIso(new Date());
  const months = locale === 'mk' ? MK_MONTHS : EN_MONTHS;
  const weekdays = locale === 'mk' ? MK_WEEKDAYS : EN_WEEKDAYS;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const base = Math.min(currentYear - 10, view.year - 5);
    const end = Math.max(currentYear + 10, view.year + 5);
    const list: number[] = [];
    for (let y = base; y <= end; y++) list.push(y);
    return list;
  }, [view.year]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = autoFormatDateTyping(e.target.value, textValue);
    setTextValue(formatted);

    if (formatted.trim() === '') {
      if (!required) {
        onChange('');
      }
      return;
    }

    if (formatted.length >= 8) {
      const parsedIso = parseDDMMYYYYToIso(formatted);
      if (parsedIso && !isDateDisabled(parsedIso)) {
        onChange(parsedIso);
        setView(isoToYearMonth(parsedIso));
      }
    }
  };

  const handleInputBlur = () => {
    const trimmed = textValue.trim();
    if (!trimmed) {
      if (required) {
        setTextValue(formattedDisplay);
      } else {
        onChange('');
        setTextValue('');
      }
      return;
    }
    const parsedIso = parseDDMMYYYYToIso(trimmed);
    if (parsedIso && !isDateDisabled(parsedIso)) {
      onChange(parsedIso);
      setTextValue(formatDate(parsedIso));
    } else {
      // Revert to last valid formatted value
      setTextValue(formattedDisplay);
    }
  };

  const handleSelectDate = (iso: string) => {
    if (isDateDisabled(iso)) return;
    onChange(iso);
    setTextValue(formatDate(iso));
    setIsOpen(false);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={textValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => {
            if (!disabled) {
              setView(isoToYearMonth(normalizedIso || todayIso));
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel || 'dd/mm/yyyy'}
          maxLength={10}
          className={`${
            className ||
            'w-full h-9 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none font-medium focus:border-primary'
          } pr-8 tabular-nums`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setView(isoToYearMonth(normalizedIso || todayIso));
            setIsOpen((prev) => !prev);
          }}
          className="absolute right-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={locale === 'mk' ? 'Отвори календар' : 'Open calendar'}
          tabIndex={-1}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: coords.top, left: coords.left, width: 272 }}
            className="fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl p-3 text-xs select-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header: Prev / Month+Year / Next */}
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={locale === 'mk' ? 'Претходен месец' : 'Previous month'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 min-w-0">
                <select
                  value={view.month}
                  onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
                  className="h-7 px-1.5 rounded-md border border-border bg-background text-foreground font-semibold text-[11px] outline-none cursor-pointer"
                  aria-label={locale === 'mk' ? 'Месец' : 'Month'}
                >
                  {months.map((label, idx) => (
                    <option key={label} value={idx} className="bg-card text-foreground">
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={view.year}
                  onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
                  className="h-7 px-1.5 rounded-md border border-border bg-background text-foreground font-semibold text-[11px] outline-none cursor-pointer tabular-nums"
                  aria-label={locale === 'mk' ? 'Година' : 'Year'}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y} className="bg-card text-foreground">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={locale === 'mk' ? 'Следен месец' : 'Next month'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Weekday Headers (Mon–Sun) */}
            <div className="grid grid-cols-7 gap-0.5 mb-1 text-center">
              {weekdays.map((wd) => (
                <div key={wd} className="text-[10px] font-semibold text-muted-foreground py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarCells.map((cell) => {
                const isSelected = cell.iso === normalizedIso;
                const isToday = cell.iso === todayIso;
                const cellDisabled = isDateDisabled(cell.iso);
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={cellDisabled}
                    onClick={() => handleSelectDate(cell.iso)}
                    className={`h-8 w-full rounded-md text-[11px] font-medium tabular-nums transition-colors flex items-center justify-center ${
                      cellDisabled
                        ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                        : isSelected
                        ? 'bg-primary text-primary-foreground font-bold cursor-pointer'
                        : isToday
                        ? 'border border-primary/60 text-primary font-semibold hover:bg-primary/10 cursor-pointer'
                        : cell.inMonth
                        ? 'text-foreground hover:bg-muted cursor-pointer'
                        : 'text-muted-foreground/50 hover:bg-muted/60 cursor-pointer'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer: Today + Clear */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/70">
              <button
                type="button"
                disabled={isDateDisabled(todayIso)}
                onClick={() => handleSelectDate(todayIso)}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {locale === 'mk' ? 'Денес' : 'Today'} ({formatDate(todayIso)})
              </button>

              {canClear && normalizedIso && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setTextValue('');
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>{locale === 'mk' ? 'Избриши' : 'Clear'}</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export interface DateTimePickerProps {
  /** ISO datetime string 'YYYY-MM-DDTHH:mm' (or empty string '') */
  value: string;
  /** Called with 'YYYY-MM-DDTHH:mm' or '' */
  onChange: (isoDateTime: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  const { locale } = useI18n();
  const { date, time } = splitIsoDateTime(value);
  const currentTime = time || '09:00';

  const handleDateChange = (nextDate: string) => {
    if (!nextDate) {
      onChange('');
      return;
    }
    onChange(`${nextDate}T${currentTime}`);
  };

  const handleTimeChange = (nextTime: string) => {
    const baseDate = date || toLocalDateIso(new Date());
    onChange(`${baseDate}T${nextTime}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_104px] gap-2">
      <DatePicker
        value={date}
        onChange={handleDateChange}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        className={className}
        ariaLabel={ariaLabel}
      />
      <div className="relative flex items-center">
        <Clock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
        <select
          disabled={disabled || !date}
          value={currentTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          aria-label={locale === 'mk' ? 'Време (24ч)' : 'Time (24h)'}
          className="w-full h-9 pl-7 pr-2 rounded-lg border border-border bg-background text-foreground font-mono text-xs font-medium outline-none focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!TIME_SLOTS_24H.includes(currentTime) && (
            <option value={currentTime} className="bg-card text-foreground">
              {currentTime}
            </option>
          )}
          {TIME_SLOTS_24H.map((slot) => (
            <option key={slot} value={slot} className="bg-card text-foreground">
              {slot}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
