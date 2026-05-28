/**
 * Currency / number formatting helpers.
 * Uses tabular-nums and Intl for locale-aware output.
 */

export function formatCurrency(amount: number | string | null | undefined, currency = 'USD'): string {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatCurrencyCompact(amount: number | string | null | undefined, currency = 'USD'): string {
  const n = typeof amount === 'number' ? amount : Number(amount ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatDateInput(date: Date = new Date()): string {
  // YYYY-MM-DD for <input type="date">
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function startOfYear(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), 0, 1);
}
export function endOfYear(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), 11, 31);
}
