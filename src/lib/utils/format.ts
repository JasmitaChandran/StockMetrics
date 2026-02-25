import { format } from 'date-fns';

export const formatCurrency = (
  value: number | null | undefined,
  currency: 'USD' | 'INR' = 'USD',
  compact = true,
) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 2 : 4,
    notation: compact && Math.abs(value) >= 1000 ? 'compact' : 'standard',
  }).format(value);
};

export const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(value);
};

export const formatPercent = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(digits)}%`;
};

export const formatDateTime = (input?: string | Date | null) => {
  if (!input) return 'N/A';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'dd MMM yyyy, hh:mm a');
};

export const formatRelativeSimple = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};
