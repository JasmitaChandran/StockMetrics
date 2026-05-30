import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatNumber,
  formatPercent,
  formatRelativeSimple,
} from '@/lib/utils/format';

describe('format helpers', () => {
  it('returns N/A for missing numeric values', () => {
    expect(formatCurrency(null)).toBe('N/A');
    expect(formatNumber(undefined)).toBe('N/A');
    expect(formatPercent(Number.NaN)).toBe('N/A');
    expect(formatRelativeSimple(undefined)).toBe('N/A');
  });

  it('formats currency in compact and standard notation', () => {
    expect(formatCurrency(1500, 'USD', true)).toBe(
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
        notation: 'compact',
      }).format(1500),
    );

    expect(formatCurrency(1500.1234, 'INR', false)).toBe(
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 4,
        notation: 'standard',
      }).format(1500.1234),
    );
  });

  it('formats numbers and percent values with expected precision', () => {
    expect(formatNumber(12345.6789, 3)).toBe('12,345.679');
    expect(formatPercent(12.345, 2)).toBe('12.35%');
    expect(formatRelativeSimple(1.2)).toBe('+1.20%');
    expect(formatRelativeSimple(-1.2)).toBe('-1.20%');
    expect(formatRelativeSimple(0)).toBe('0.00%');
  });

  it('formats date/time values and handles invalid input', () => {
    const date = new Date(2026, 0, 5, 13, 7, 9);

    expect(formatDateTime(date)).toBe('05 Jan 2026, 01:07 PM');
    expect(formatDateTimeWithSeconds(date)).toBe('05 Jan 2026, 01:07:09 PM');
    expect(formatDateTime('not-a-date')).toBe('N/A');
    expect(formatDateTimeWithSeconds(null)).toBe('N/A');
  });
});
