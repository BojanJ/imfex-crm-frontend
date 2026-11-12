'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Filter } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  code?: string; // e.g. PRJ-2026-001, OFF-2026-012, PRD-001
  customerName?: string;
  badge?: string; // e.g. "АКТИВЕН", "ЗАВРШЕН", "НА ЛАГЕР: 15"
  badgeColor?: string; // custom color class for the badge
  isActive?: boolean; // whether this entity is currently active
  keywords?: string[]; // additional search keywords (e.g. phone, EDB, city, email)
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
  allowClear?: boolean;
  clearLabel?: string;
  showActiveToggle?: boolean;
  defaultActiveOnly?: boolean;
  renderOption?: (option: SearchableSelectOption, isSelected: boolean) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Избери опција...',
  searchPlaceholder = 'Пребарај по код, назив, клиент...',
  className = '',
  disabled = false,
  emptyMessage = 'Нема пронајдено резултати',
  allowClear = false,
  clearLabel = '-- Без избор --',
  showActiveToggle = false,
  defaultActiveOnly = false,
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(defaultActiveOnly);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Check if any option defines `isActive`
  const hasActiveInformation = useMemo(() => {
    return options.some((opt) => opt.isActive !== undefined);
  }, [options]);

  const shouldShowToggle = showActiveToggle || (hasActiveInformation && options.length > 5);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(targetNode);
      const isInsidePopover = popoverRef.current?.contains(targetNode);
      if (!isInsideContainer && !isInsidePopover) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update fixed popover position relative to viewport trigger button
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dropHeight = 320;
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < dropHeight && rect.top > dropHeight;

        const popoverWidth = Math.max(rect.width, 260);
        const maxLeft = window.innerWidth - popoverWidth - 12;
        const calculatedLeft = Math.max(12, Math.min(rect.left, maxLeft));

        setCoords({
          top: showAbove ? Math.max(12, rect.top - dropHeight - 4) : rect.bottom + 4,
          left: calculatedLeft,
          width: popoverWidth,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Auto focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Count active vs total items
  const activeCount = useMemo(() => {
    return options.filter((o) => o.isActive !== false).length;
  }, [options]);

  const filteredOptions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const searchTerms = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

    return options.filter((opt) => {
      // 1. Filter by active if toggled
      if (activeOnly && opt.isActive === false) {
        return false;
      }

      // 2. Search match
      if (searchTerms.length === 0) return true;

      const haystack = [
        opt.label || '',
        opt.sublabel || '',
        opt.value || '',
        opt.code || '',
        opt.customerName || '',
        opt.badge || '',
        ...(opt.keywords || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchTerms.every((term) => haystack.includes(term));
    });
  }, [options, search, activeOnly]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full text-left">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={selectId}
        className={`w-full flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          className ||
          'px-3 py-2 text-xs rounded-lg border border-border bg-background font-semibold text-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate text-left flex-1 flex items-center gap-1.5 min-w-0">
          {selectedOption ? (
            <>
              {selectedOption.code && (
                <span className="font-mono text-[10px] font-black bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded shrink-0">
                  {selectedOption.code}
                </span>
              )}
              <span className="truncate font-semibold">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span
                  className={`hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                    selectedOption.badgeColor || 'bg-muted text-muted-foreground'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground font-normal">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedOption && (
            <span
              onClick={handleClear}
              title="Исчисти избор"
              className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-foreground' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          id={selectId}
          role="listbox"
          style={
            coords
              ? {
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: `${coords.width}px`,
                  zIndex: 99999,
                }
              : { position: 'absolute', zIndex: 99999 }
          }
          className="max-h-80 rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="p-2 border-b border-border bg-muted/40 sticky top-0 z-10 space-y-1.5">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-background border border-border focus-within:ring-2 focus-within:ring-primary">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-xs bg-transparent border-none outline-none font-medium text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Active vs All Filter Toggle */}
            {shouldShowToggle && (
              <div className="flex items-center justify-between pt-0.5 px-1 text-[10px]">
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveOnly(false)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      !activeOnly
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Сите ({options.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOnly(true)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      activeOnly
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Само активни ({activeCount})
                  </button>
                </div>

                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Filter className="w-2.5 h-2.5" />
                  {filteredOptions.length} резулт.
                </span>
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 max-h-60 space-y-1 scrollbar-thin">
            {/* Allow clearing option if configured */}
            {allowClear && value && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 cursor-pointer border-b border-border/50 mb-1"
              >
                <X className="w-3 h-3 text-red-500" />
                <span>{clearLabel}</span>
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground italic space-y-1">
                <div>{emptyMessage}</div>
                {activeOnly && (
                  <button
                    type="button"
                    onClick={() => setActiveOnly(false)}
                    className="text-primary hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    Прикажи и неактивни ставки ({options.length})
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-xs'
                        : 'border-transparent text-foreground hover:bg-muted/70'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="truncate flex-1 pr-2 min-w-0">
                      {renderOption ? (
                        renderOption(opt, isSelected)
                      ) : (
                        <div className="space-y-0.5">
                          {/* Row 1: Code + Label + Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {opt.code && (
                              <span className="font-mono text-[10px] font-black bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded shrink-0">
                                {opt.code}
                              </span>
                            )}
                            <span className="truncate font-bold text-foreground">
                              {opt.label}
                            </span>
                            {opt.badge && (
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                  opt.badgeColor ||
                                  (opt.isActive === false
                                    ? 'bg-gray-500/10 text-gray-500'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')
                                }`}
                              >
                                {opt.badge}
                              </span>
                            )}
                          </div>

                          {/* Row 2: Customer or Sublabel */}
                          {(opt.customerName || opt.sublabel) && (
                            <div className="text-[11px] text-muted-foreground truncate font-normal flex items-center gap-1">
                              {opt.customerName && (
                                <span className="font-semibold text-foreground/80 truncate">
                                  {opt.customerName}
                                  {opt.sublabel && ' • '}
                                </span>
                              )}
                              {opt.sublabel && <span className="truncate">{opt.sublabel}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
