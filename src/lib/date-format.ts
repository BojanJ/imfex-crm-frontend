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
