import type {
  Account,
  AccountInsert,
  Category,
  CategoryInsert,
  Coa,
  CoaInsert,
  Recurring,
  RecurringInsert,
  Transaction,
  TransactionInsert,
} from '@/types/db';
import { demoUuid, getDemoState, mutateDemoState } from '@/demo/store';

const nowIso = () => new Date().toISOString();

function requireUser(userKey: string): void {
  const s = getDemoState();
  if (s.userKey !== userKey) {
    // In the demo app we only have one user; fail loudly if something is off.
    throw new Error('Invalid demo user');
  }
}

// ============== ACCOUNTS ==============
export async function listAccounts(userKey: string): Promise<Account[]> {
  requireUser(userKey);
  const s = getDemoState();
  return [...s.data.accounts].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

export async function createAccount(userKey: string, payload: Omit<AccountInsert, 'user_key'>): Promise<Account> {
  requireUser(userKey);
  const created = nowIso();
  const row: Account = {
    id: payload.id ?? demoUuid('acc'),
    user_key: userKey,
    name: payload.name,
    type: payload.type ?? 'checking',
    subtype: payload.subtype ?? null,
    currency: payload.currency ?? 'USD',
    opening_balance: payload.opening_balance ?? 0,
    institution: payload.institution ?? null,
    last4: payload.last4 ?? null,
    archived: payload.archived ?? false,
    created_at: payload.created_at ?? created,
    updated_at: payload.updated_at ?? created,
  };
  mutateDemoState((d) => {
    d.data.accounts.push(row);
  });
  await audit(userKey, 'account', row.id, 'create', null, row);
  return row;
}

export async function updateAccount(userKey: string, id: string, patch: Partial<AccountInsert>): Promise<Account> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.accounts.find((a) => a.id === id) ?? null;
  if (!before) throw new Error('Account not found');
  const updated: Account = { ...before, ...patch, id: before.id, user_key: before.user_key, updated_at: nowIso() };
  mutateDemoState((d) => {
    d.data.accounts = d.data.accounts.map((a) => (a.id === id ? updated : a));
  });
  await audit(userKey, 'account', id, 'update', before, updated);
  return updated;
}

export async function deleteAccount(userKey: string, id: string): Promise<void> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.accounts.find((a) => a.id === id) ?? null;
  mutateDemoState((d) => {
    d.data.accounts = d.data.accounts.filter((a) => a.id !== id);
    // Also detach transactions that referenced this account.
    d.data.transactions = d.data.transactions.map((t) => (t.account_id === id ? { ...t, account_id: null, updated_at: nowIso() } : t));
  });
  await audit(userKey, 'account', id, 'delete', before, null);
}

// ============== CHART OF ACCOUNTS ==============
export async function listCoa(userKey: string): Promise<Coa[]> {
  requireUser(userKey);
  const s = getDemoState();
  return [...s.data.chart_of_accounts].sort((a, b) => a.code.localeCompare(b.code));
}

export async function createCoa(userKey: string, payload: Omit<CoaInsert, 'user_key'>): Promise<Coa> {
  requireUser(userKey);
  const created = nowIso();
  const row: Coa = {
    id: payload.id ?? demoUuid('coa'),
    user_key: userKey,
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    type: payload.type,
    subtype: payload.subtype ?? null,
    parent_id: payload.parent_id ?? null,
    is_active: payload.is_active ?? true,
    is_system: payload.is_system ?? false,
    plaid_keywords: payload.plaid_keywords ?? null,
    created_at: payload.created_at ?? created,
    updated_at: payload.updated_at ?? created,
  };
  mutateDemoState((d) => {
    d.data.chart_of_accounts.push(row);
  });
  await audit(userKey, 'coa', row.id, 'create', null, row);
  return row;
}

export async function updateCoa(userKey: string, id: string, patch: Partial<CoaInsert>): Promise<Coa> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.chart_of_accounts.find((c) => c.id === id) ?? null;
  if (!before) throw new Error('CoA account not found');
  const updated: Coa = { ...before, ...patch, id: before.id, user_key: before.user_key, updated_at: nowIso() };
  mutateDemoState((d) => {
    d.data.chart_of_accounts = d.data.chart_of_accounts.map((c) => (c.id === id ? updated : c));
  });
  await audit(userKey, 'coa', id, 'update', before, updated);
  return updated;
}

export async function deleteCoa(userKey: string, id: string): Promise<void> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.chart_of_accounts.find((c) => c.id === id) ?? null;
  mutateDemoState((d) => {
    d.data.chart_of_accounts = d.data.chart_of_accounts.filter((c) => c.id !== id);
    d.data.transactions = d.data.transactions.map((t) => (t.coa_id === id ? { ...t, coa_id: null, updated_at: nowIso() } : t));
    d.data.recurring_transactions = d.data.recurring_transactions.map((r) => (r.coa_id === id ? { ...r, coa_id: null, updated_at: nowIso() } : r));
  });
  await audit(userKey, 'coa', id, 'delete', before, null);
}

// ============== CATEGORIES ==============
export async function listCategories(userKey: string): Promise<Category[]> {
  requireUser(userKey);
  const s = getDemoState();
  return [...s.data.categories].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(userKey: string, payload: Omit<CategoryInsert, 'user_key'>): Promise<Category> {
  requireUser(userKey);
  const created = nowIso();
  const row: Category = {
    id: payload.id ?? demoUuid('cat'),
    user_key: userKey,
    name: payload.name,
    color: payload.color ?? '#64748b',
    type: payload.type ?? null,
    tax_deductible: payload.tax_deductible ?? false,
    archived: payload.archived ?? false,
    created_at: payload.created_at ?? created,
    updated_at: payload.updated_at ?? created,
  };
  mutateDemoState((d) => {
    d.data.categories.push(row);
  });
  await audit(userKey, 'category', row.id, 'create', null, row);
  return row;
}

export async function deleteCategory(userKey: string, id: string): Promise<void> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.categories.find((c) => c.id === id) ?? null;
  mutateDemoState((d) => {
    d.data.categories = d.data.categories.filter((c) => c.id !== id);
    d.data.transactions = d.data.transactions.map((t) => (t.category_id === id ? { ...t, category_id: null, updated_at: nowIso() } : t));
    d.data.recurring_transactions = d.data.recurring_transactions.map((r) => (r.category_id === id ? { ...r, category_id: null, updated_at: nowIso() } : r));
  });
  await audit(userKey, 'category', id, 'delete', before, null);
}

// ============== TRANSACTIONS ==============
export interface TxnFilter {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  search?: string;
  limit?: number;
}

export async function listTransactions(userKey: string, filter: TxnFilter = {}): Promise<Transaction[]> {
  requireUser(userKey);
  const s = getDemoState();
  const q = (filter.search ?? '').trim().toLowerCase();
  const from = filter.from ?? null;
  const to = filter.to ?? null;

  const filtered = s.data.transactions.filter((t) => {
    if (filter.accountId && t.account_id !== filter.accountId) return false;
    if (filter.categoryId && t.category_id !== filter.categoryId) return false;
    if (filter.type && t.type !== filter.type) return false;
    if (from && t.txn_date < from) return false;
    if (to && t.txn_date > to) return false;
    if (q) {
      const hay = `${t.description ?? ''} ${t.merchant ?? ''} ${t.notes ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => (a.txn_date < b.txn_date ? 1 : a.txn_date > b.txn_date ? -1 : 0));
  return filter.limit ? sorted.slice(0, filter.limit) : sorted;
}

export async function createTransaction(
  userKey: string,
  payload: Omit<TransactionInsert, 'user_key'>,
): Promise<Transaction> {
  requireUser(userKey);
  const created = nowIso();
  const row: Transaction = {
    id: payload.id ?? demoUuid('txn'),
    user_key: userKey,
    business_unit_id: payload.business_unit_id ?? null,
    txn_date: payload.txn_date,
    description: payload.description,
    merchant: payload.merchant ?? null,
    amount: payload.amount,
    type: payload.type,
    status: payload.status ?? 'cleared',
    category_id: payload.category_id ?? null,
    account_id: payload.account_id ?? null,
    coa_id: payload.coa_id ?? null,
    tax_deductible: payload.tax_deductible ?? false,
    notes: payload.notes ?? null,
    transfer_pair_id: payload.transfer_pair_id ?? null,
    recurring_id: payload.recurring_id ?? null,
    created_at: payload.created_at ?? created,
    updated_at: payload.updated_at ?? created,
  };
  mutateDemoState((d) => {
    d.data.transactions.push(row);
  });
  await audit(userKey, 'transaction', row.id, 'create', null, row);
  return row;
}

export async function createTransfer(
  userKey: string,
  args: { from_account_id: string; to_account_id: string; amount: number; txn_date: string; description?: string; notes?: string | null },
): Promise<{ outflow: Transaction; inflow: Transaction }> {
  const desc = args.description || 'Transfer';
  const outflow = await createTransaction(userKey, {
    txn_date: args.txn_date,
    description: desc,
    amount: -Math.abs(args.amount),
    type: 'transfer',
    account_id: args.from_account_id,
    notes: args.notes ?? null,
  });
  const inflow = await createTransaction(userKey, {
    txn_date: args.txn_date,
    description: desc,
    amount: Math.abs(args.amount),
    type: 'transfer',
    account_id: args.to_account_id,
    notes: args.notes ?? null,
    transfer_pair_id: outflow.id,
  });
  await updateTransaction(userKey, outflow.id, { transfer_pair_id: inflow.id });
  return { outflow, inflow };
}

export async function updateTransaction(
  userKey: string,
  id: string,
  patch: Partial<TransactionInsert>,
): Promise<Transaction> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.transactions.find((t) => t.id === id) ?? null;
  if (!before) throw new Error('Transaction not found');
  const updated: Transaction = { ...before, ...patch, id: before.id, user_key: before.user_key, updated_at: nowIso() };
  mutateDemoState((d) => {
    d.data.transactions = d.data.transactions.map((t) => (t.id === id ? updated : t));
  });
  await audit(userKey, 'transaction', id, 'update', before, updated);
  return updated;
}

export async function deleteTransaction(userKey: string, id: string): Promise<void> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.transactions.find((t) => t.id === id) ?? null;
  mutateDemoState((d) => {
    d.data.transactions = d.data.transactions.filter((t) => t.id !== id);
    // If it was part of a transfer pair, detach the other side.
    d.data.transactions = d.data.transactions.map((t) => (t.transfer_pair_id === id ? { ...t, transfer_pair_id: null, updated_at: nowIso() } : t));
  });
  await audit(userKey, 'transaction', id, 'delete', before, null);
}

// ============== RECURRING ==============
export async function listRecurring(userKey: string): Promise<Recurring[]> {
  requireUser(userKey);
  const s = getDemoState();
  return [...s.data.recurring_transactions].sort((a, b) => (a.next_run < b.next_run ? -1 : a.next_run > b.next_run ? 1 : 0));
}

export async function createRecurring(userKey: string, payload: Omit<RecurringInsert, 'user_key'>): Promise<Recurring> {
  requireUser(userKey);
  const created = nowIso();
  const row: Recurring = {
    id: payload.id ?? demoUuid('rec'),
    user_key: userKey,
    business_unit_id: payload.business_unit_id ?? null,
    description: payload.description,
    amount: payload.amount,
    type: payload.type,
    account_id: payload.account_id ?? null,
    category_id: payload.category_id ?? null,
    coa_id: payload.coa_id ?? null,
    cadence: payload.cadence ?? 'monthly',
    next_run: payload.next_run,
    end_date: payload.end_date ?? null,
    active: payload.active ?? true,
    notes: payload.notes ?? null,
    created_at: payload.created_at ?? created,
    updated_at: payload.updated_at ?? created,
  };
  mutateDemoState((d) => {
    d.data.recurring_transactions.push(row);
  });
  await audit(userKey, 'recurring', row.id, 'create', null, row);
  return row;
}

export async function deleteRecurring(userKey: string, id: string): Promise<void> {
  requireUser(userKey);
  const s = getDemoState();
  const before = s.data.recurring_transactions.find((r) => r.id === id) ?? null;
  mutateDemoState((d) => {
    d.data.recurring_transactions = d.data.recurring_transactions.filter((r) => r.id !== id);
    d.data.transactions = d.data.transactions.map((t) => (t.recurring_id === id ? { ...t, recurring_id: null, updated_at: nowIso() } : t));
  });
  await audit(userKey, 'recurring', id, 'delete', before, null);
}

// ============== AUDIT ==============
export async function audit(
  userKey: string,
  entity_type: string,
  entity_id: string | null,
  action: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  try {
    requireUser(userKey);
    const created_at = nowIso();
    mutateDemoState((d) => {
      d.data.audit_log.unshift({
        id: demoUuid('audit'),
        user_key: userKey,
        entity_type,
        entity_id,
        action,
        before: (before as never) ?? null,
        after: (after as never) ?? null,
        actor: userKey,
        created_at,
      });
      d.data.audit_log = d.data.audit_log.slice(0, 500);
    });
  } catch (e) {
    // Audit should never break demo flows.
    if (import.meta.env.DEV) console.warn('[audit] skipped', e);
  }
}

export async function listAuditLog(userKey: string, limit = 200) {
  requireUser(userKey);
  const s = getDemoState();
  return (s.data.audit_log ?? []).slice(0, limit);
}

// ============== SEED ==============
export async function seedDefaultCoa(): Promise<void> {
  // No-op: the demo store is seeded at boot. Kept for API parity.
  getDemoState();
}
