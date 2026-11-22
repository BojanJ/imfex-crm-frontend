/**
 * Utility for formatting dates strictly as DD/MM/YYYY throughout the application.
 */

export function formatDate(val?: string | number | Date | null, fallback: string = ''): string {
  if (!val) return fallback;

  // If already strictly in DD/MM/YYYY format
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
    return val.trim();
  }

  // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss directly without timezone shift
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Check if starts with YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // Check if DD.MM.YYYY (dots)
    const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dotMatch) {
      const day = dotMatch[1].padStart(2, '0');
      const month = dotMatch[2].padStart(2, '0');
      const year = dotMatch[3];
      return `${day}/${month}/${year}`;
    }
  }

  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback || String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return fallback || String(val);
  }
}

export function formatDateTime(val?: string | number | Date | null, fallback: string = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Handle bare YYYY-MM-DDTHH:mm (no timezone offset) without UTC shift
    const bareIsoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (bareIsoMatch) {
      const [, y, m, d, hh, mm] = bareIsoMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y} ${hh.padStart(2, '0')}:${mm}`;
    }
    // Date-only ISO string
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback || String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return fallback || String(val);
  }
}

/**
 * Formats a Date into local YYYY-MM-DD (no UTC day-shift).
 */
export function toLocalDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Strictly parses DD/MM/YYYY (or DD.MM.YYYY / DD-MM-YYYY) into ISO YYYY-MM-DD.
 * Returns null if the string is incomplete or not a real calendar date (e.g. 31/02/2026).
 */
export function parseDDMMYYYYToIso(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Splits any ISO date/datetime value into local { date: 'YYYY-MM-DD', time: 'HH:mm' }.
 */
export function splitIsoDateTime(val?: string | null): { date: string; time: string } {
  if (!val) return { date: '', time: '' };
  const trimmed = String(val).trim();
  if (!trimmed) return { date: '', time: '' };

  // Bare local YYYY-MM-DDTHH:mm (no Z/offset)
  const bareMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?$/);
  if (bareMatch) {
    return { date: bareMatch[1], time: bareMatch[2] };
  }

  // Date-only YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date: trimmed, time: '' };
  }

  // Full ISO timestamp with Z / offset -> convert to local date & 24h time
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    const date = toLocalDateIso(d);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { date, time };
  }

  return { date: toDateInputValue(trimmed), time: '' };
}

/**
 * Normalizes any ISO string, DD/MM/YYYY, or Date to YYYY-MM-DD for HTML <input type="date">.
 */
export function toDateInputValue(val?: string | number | Date | null, fallback: string = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return fallback;
  }
}

/**
 * Single source of truth for Offer validity date across PdfModal, PrintableOfferDocument,
 * generateOfferVectorPdf, and OfferBuilderForm (FE-22).
 * Falls back to createdAt + 14 days when validUntil is not set.
 */
export function resolveOfferValidUntilDate(offer?: { validUntil?: string | null; createdAt?: string | null } | null): Date {
  if (offer?.validUntil) {
    const parsed = new Date(offer.validUntil);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const baseMs = offer?.createdAt ? new Date(offer.createdAt).getTime() : Date.now();
  const safeBaseMs = Number.isNaN(baseMs) ? Date.now() : baseMs;
  return new Date(safeBaseMs + 14 * 24 * 60 * 60 * 1000);
}

export function resolveOfferValidUntil(offer?: { validUntil?: string | null; createdAt?: string | null } | null): string {
  if (offer?.validUntil) {
    return formatDate(offer.validUntil, formatDate(resolveOfferValidUntilDate(offer)));
  }
  return formatDate(resolveOfferValidUntilDate(offer));
}
