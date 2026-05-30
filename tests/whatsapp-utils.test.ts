import { describe, expect, it } from 'vitest';
import {
  isValidWhatsAppPhone,
  maskPhoneNumber,
  normalizeWhatsAppPhone,
  toE164Phone,
} from '@/lib/utils/whatsapp';

describe('whatsapp phone utilities', () => {
  it('normalizes separators and preserves explicit plus prefix', () => {
    expect(normalizeWhatsAppPhone('  +91 98765-43210  ')).toBe('+919876543210');
    expect(normalizeWhatsAppPhone(' (415) 555-2671 ')).toBe('4155552671');
  });

  it('converts phone numbers to E.164 format', () => {
    expect(toE164Phone('919876543210')).toBe('+919876543210');
    expect(toE164Phone('+14155552671')).toBe('+14155552671');
  });

  it('validates E.164-compatible phone numbers', () => {
    expect(isValidWhatsAppPhone('+14155552671')).toBe(true);
    expect(isValidWhatsAppPhone('919876543210')).toBe(true);
    expect(isValidWhatsAppPhone('12345')).toBe(false);
    expect(isValidWhatsAppPhone('+0123456789')).toBe(false);
  });

  it('masks every digit except the last 4', () => {
    expect(maskPhoneNumber('+14155552671')).toBe('+*******2671');
    expect(maskPhoneNumber('')).toBe('');
  });
});
