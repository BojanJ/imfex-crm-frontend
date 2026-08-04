'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
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
  renderOption?: (option: SearchableSelectOption, isSelected: boolean) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  className = '',
  disabled = false,
  emptyMessage = 'No options found',
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

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
        const dropHeight = 240;
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < dropHeight && rect.top > dropHeight;

        const popoverWidth = Math.max(rect.width, 200);
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

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(searchLower) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchLower)) ||
      opt.value.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
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
        <span className="truncate text-left flex-1">
          {selectedOption ? selectedOption.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
          className="max-h-64 rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="p-2 border-b border-border bg-muted/30 sticky top-0 z-10 flex items-center gap-2">
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

          {/* Options List */}
          <div className="overflow-y-auto p-1 max-h-48 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground italic">
                {emptyMessage}
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-foreground hover:bg-muted'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="truncate flex-1 pr-2">
                      {renderOption ? (
                        renderOption(opt, isSelected)
                      ) : (
                        <>
                          <div className="truncate">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="text-[10px] text-muted-foreground truncate font-normal">
                              {opt.sublabel}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
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
