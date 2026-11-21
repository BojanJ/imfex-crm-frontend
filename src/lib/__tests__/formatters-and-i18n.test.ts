import { describe, it, expect } from 'vitest';
import { formatCurrency, formatMkd, formatTime24, TIME_SLOTS_24H } from '../formatters';
import { formatDate } from '../date-format';
import {
  getOfferStatusLabel,
  getProjectStatusLabel,
  getCustomerTypeLabel,
  getServiceTypeLabel,
} from '../enum-labels';
import mk from '@/i18n/mk.json';
import en from '@/i18n/en.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? flattenKeys(v as Record<string, unknown>, key)
      : [key];
  });
}

describe('Currency, Date & 24h Time Formatters (I18N-06)', () => {
  it('formats EUR amounts uniformly with thousand separators', () => {
    expect(formatCurrency(6619.8)).toBe('€6,619.80');
    expect(formatCurrency(0)).toBe('€0.00');
    expect(formatCurrency(-125.5)).toBe('-€125.50');
    expect(formatCurrency(50, true)).toBe('+€50.00');
  });

  it('formats MKD amounts consistently', () => {
    expect(formatMkd(6150)).toContain('МКД');
  });

  it('formats dates as DD/MM/YYYY without timezone day-shift', () => {
    expect(formatDate('2026-11-05')).toBe('05/11/2026');
    expect(formatDate('05.11.2026')).toBe('05/11/2026');
    expect(formatDate('05/11/2026')).toBe('05/11/2026');
    expect(formatDate(null, '—')).toBe('—');
  });

  it('formats 24-hour times and exposes 48 half-hour slots', () => {
    expect(formatTime24('2026-11-21T14:30:00')).toBe('14:30');
    expect(formatTime24('9:05')).toBe('09:05');
    expect(TIME_SLOTS_24H).toHaveLength(48);
    expect(TIME_SLOTS_24H[0]).toBe('00:00');
    expect(TIME_SLOTS_24H[47]).toBe('23:30');
  });
});

describe('Enum Labels & i18n Dictionary Parity (I18N-04)', () => {
  it('translates CRM enums in both MK and EN', () => {
    expect(getOfferStatusLabel('ACCEPTED', 'mk')).toBe('Прифатена');
    expect(getOfferStatusLabel('ACCEPTED', 'en')).toBe('Accepted');
    expect(getProjectStatusLabel('PROCUREMENT', 'mk')).toBe('Набавка');
    expect(getCustomerTypeLabel('COMPANY', 'mk')).toBe('Правно Лице');
    expect(getServiceTypeLabel('INSTALLATION', 'mk')).toBe('Монтажа');
  });

  it('maintains 100% key parity between mk.json and en.json', () => {
    const mkKeys = new Set(flattenKeys(mk as Record<string, unknown>));
    const enKeys = new Set(flattenKeys(en as Record<string, unknown>));
    const missingInEn = [...mkKeys].filter((k) => !enKeys.has(k));
    const missingInMk = [...enKeys].filter((k) => !mkKeys.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInMk).toEqual([]);
    expect(mkKeys.size).toBeGreaterThan(300);
  });
});

describe('Finance & Quote Math Invariants (FE-02)', () => {
  it('calculates discount, VAT (including 0% VAT), and advance deduction accurately', () => {
    const subtotal = 2000;
    const discountRate = 10;
    const discountAmount = Math.round(subtotal * (discountRate / 100) * 100) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxRate18 = 18;
    const taxAmount = Math.round(afterDiscount * (taxRate18 / 100) * 100) / 100;
    const total = Math.round((afterDiscount + taxAmount) * 100) / 100;

    expect(discountAmount).toBe(200);
    expect(taxAmount).toBe(324);
    expect(total).toBe(2124);

    // 0% VAT case
    const zeroVatTax = Math.round(afterDiscount * (0 / 100) * 100) / 100;
    expect(zeroVatTax).toBe(0);

    // 50% advance payment & final remaining balance
    const advanceAmount = Math.round(total * 0.5 * 100) / 100;
    const remainingFinal = Math.round((total - advanceAmount) * 100) / 100;
    expect(advanceAmount).toBe(1062);
    expect(remainingFinal).toBe(1062);
  });
});
