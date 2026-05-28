/**
 * Demo Plaid module.
 *
 * The real app uses an Edge Function + Plaid; the static demo disables all
 * external bank linking.
 */

export async function createLinkToken(): Promise<string> {
  throw new Error('Plaid is disabled in the static demo.');
}

export async function exchangePublicToken(): Promise<{ success: boolean; item_id: string; accounts_stored: number }> {
  throw new Error('Plaid is disabled in the static demo.');
}

export interface PlaidLinkedAccount {
  id: string;
  plaid_item_id: string;
  plaid_account_id: string | null;
  institution_name: string;
  institution_logo: string | null;
  account_mask: string | null;
  account_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
  currency: string | null;
  last_synced_at: string | null;
  error_code: string | null;
  error_message: string | null;
  is_active: boolean;
}

export async function listLinkedAccounts(): Promise<PlaidLinkedAccount[]> {
  return [];
}

export async function syncPlaidTransactions(itemId?: string) {
  void itemId;
  return { success: false, total_synced: 0, results: [] as unknown[] };
}

export async function removePlaidItem(itemId: string) {
  void itemId;
  return { success: false };
}

export interface PlaidTransaction {
  id: string;
  linked_account_id: string | null;
  plaid_transaction_id: string | null;
  amount: number;
  currency: string | null;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string | null;
  category_detailed: string | null;
  pending: boolean | null;
  payment_channel: string | null;
  is_manual: boolean | null;
  notes: string | null;
  coa_id?: string | null;
  business_unit_id?: string | null;
  category_id?: string | null;
  tax_deductible?: boolean | null;
  user_notes?: string | null;
  txn_type_override?: string | null;
}

export async function listPlaidTransactions(opts: { from?: string; to?: string; limit?: number } = {}) {
  void opts;
  return [] as PlaidTransaction[];
}

export interface PlaidSubscription {
  id: string;
  plaid_stream_id: string | null;
  merchant_name: string;
  amount: number;
  currency: string | null;
  frequency: string;
  next_billing_date: string | null;
  last_billing_date: string | null;
  first_billing_date: string | null;
  category: string | null;
  is_active: boolean | null;
  is_manual: boolean | null;
  linked_account_id: string | null;
}

export async function listPlaidSubscriptions() {
  return [] as PlaidSubscription[];
}

export async function refreshPlaidRecurring() {
  return { success: false };
}

export interface PlaidHolding {
  id: string;
  linked_account_id: string | null;
  plaid_account_id: string;
  plaid_security_id: string;
  security_name: string | null;
  ticker_symbol: string | null;
  security_type: string | null;
  close_price: number | null;
  close_price_as_of: string | null;
  quantity: number | null;
  institution_price: number | null;
  institution_price_as_of: string | null;
  institution_value: number | null;
  cost_basis: number | null;
  currency: string;
  last_updated_at: string;
}

export async function listPlaidHoldings() {
  return [] as PlaidHolding[];
}

export async function syncPlaidHoldings(itemId?: string) {
  void itemId;
  return { success: false, total_synced: 0 };
}
