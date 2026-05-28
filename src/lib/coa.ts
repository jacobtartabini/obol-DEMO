import type { Coa, CoaType, TxnType } from '@/types/db';

/** Active COA rows suitable for transaction labeling. */
export function activeCoaAccounts(coa: Coa[]): Coa[] {
  return coa.filter((c) => c.is_active);
}

/** COA accounts that can be assigned to a transaction of the given type. */
export function coaForTransactionType(type: TxnType, coa: Coa[]): Coa[] {
  const active = activeCoaAccounts(coa);
  if (type === 'transfer') return active;
  if (type === 'income') return active.filter((c) => c.type === 'income');
  if (type === 'expense') {
    return active.filter((c) => c.type === 'expense' || c.code === '2510');
  }
  return active;
}

export function coaDisplayLabel(c: Coa): string {
  return `${c.code} · ${c.name}`;
}

export function coaLabelById(coa: Coa[], id: string | null | undefined): string {
  if (!id) return '—';
  const c = coa.find((x) => x.id === id);
  return c ? coaDisplayLabel(c) : '—';
}

/** Expense/income COA types used for P&L-style breakdowns. */
export function coaTypesForTxnType(type: TxnType): CoaType[] {
  if (type === 'income') return ['income'];
  if (type === 'expense') return ['expense'];
  return ['asset', 'liability', 'equity', 'income', 'expense'];
}

export function parsePlaidKeywordsInput(raw: string): string[] | null {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

export function formatPlaidKeywords(keywords: string[] | null | undefined): string {
  return (keywords ?? []).join(', ');
}
