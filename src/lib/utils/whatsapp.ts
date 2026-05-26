export function normalizeWhatsAppPhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';

  return `${hasPlusPrefix ? '+' : ''}${digits}`;
}

export function toE164Phone(input: string) {
  const normalized = normalizeWhatsAppPhone(input);
  if (!normalized) return '';
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

export function isValidWhatsAppPhone(input: string) {
  const phone = toE164Phone(input);
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function maskPhoneNumber(input: string) {
  const phone = toE164Phone(input);
  if (!phone) return '';
  const lastFour = phone.slice(-4);
  return `${phone.slice(0, -4).replace(/\d/g, '*')}${lastFour}`;
}
