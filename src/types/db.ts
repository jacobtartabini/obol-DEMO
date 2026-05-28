// Demo DB types.
// These intentionally match the fields that the UI expects, but are not generated
// from any backend schema.

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'loan'
  | 'investment'
  | 'other';

export type CoaType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type TxnType = 'income' | 'expense' | 'transfer';
export type TxnStatus = 'pending' | 'cleared' | 'reconciled' | 'void';
export type RecurringCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Account {
  id: string;
  user_key: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  currency: string;
  opening_balance: number;
  institution: string | null;
  last4: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
export type AccountInsert = Omit<Account, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Coa {
  id: string;
  user_key: string;
  code: string;
  name: string;
  description: string | null;
  type: CoaType;
  subtype: string | null;
  parent_id: string | null;
  is_active: boolean;
  is_system: boolean;
  plaid_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}
export type CoaInsert = Omit<Coa, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Category {
  id: string;
  user_key: string;
  name: string;
  color: string;
  type: TxnType | null;
  tax_deductible: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Transaction {
  id: string;
  user_key: string;
  business_unit_id: string | null;
  txn_date: string;
  description: string;
  merchant: string | null;
  amount: number;
  type: TxnType;
  status: TxnStatus;
  category_id: string | null;
  account_id: string | null;
  coa_id: string | null;
  tax_deductible: boolean;
  notes: string | null;
  transfer_pair_id: string | null;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
}
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Recurring {
  id: string;
  user_key: string;
  business_unit_id: string | null;
  description: string;
  amount: number;
  type: TxnType;
  account_id: string | null;
  category_id: string | null;
  coa_id: string | null;
  cadence: RecurringCadence;
  next_run: string;
  end_date: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type RecurringInsert = Omit<Recurring, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface AuditLog {
  id: string;
  user_key: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before: unknown | null;
  after: unknown | null;
  actor: string | null;
  created_at: string;
}
