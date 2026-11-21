/**
 * Shared currency and 24-hour time formatting helpers (I18N-06).
 */

const eurFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const mkdFormatter = new Intl.NumberFormat('mk-MK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: unknown, showSign = false): string {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  const absFormatted = eurFormatter.format(Math.abs(safe));
  if (safe < 0) return `-€${absFormatted}`;
  if (showSign && safe > 0) return `+€${absFormatted}`;
  return `€${absFormatted}`;
}

export function formatMkd(amount: unknown): string {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  return `${mkdFormatter.format(safe)} МКД`;
}

/**
 * Formats an ISO timestamp, Date, or "HH:mm" string strictly as 24-hour "HH:mm".
 */
export function formatTime24(val?: string | Date | null, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (hhmmMatch) {
      return `${hhmmMatch[1].padStart(2, '0')}:${hhmmMatch[2]}`;
    }
    const isoTimeMatch = trimmed.match(/T(\d{2}):(\d{2})/);
    if (isoTimeMatch) {
      return `${isoTimeMatch[1]}:${isoTimeMatch[2]}`;
    }
  }
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return fallback;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return fallback;
  }
}

/**
 * 24-hour time slots (00:00 to 23:30 in 30-min increments) for locale-independent 24h pickers.
 */
export const TIME_SLOTS_24H: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});
