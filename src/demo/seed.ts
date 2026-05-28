import type { Account, Category, Coa, Recurring, Transaction } from '@/types/db';

export const DEMO_STORAGE_KEY = 'obol_demo_v1' as const;
export const DEMO_SCHEMA_VERSION = 1 as const;

export interface DemoFileMeta {
  id: string;
  bucket: 'receipts' | 'tax-documents';
  path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
  /** Object URLs are not persisted; this is only for current session. */
  object_url?: string;
}

export interface DemoBusinessUnit {
  id: string;
  user_key: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type DemoInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface DemoInvoice {
  id: string;
  user_key: string;
  business_unit_id: string | null;
  invoice_number: string;
  status: DemoInvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  from_name: string | null;
  from_email: string | null;
  from_address: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoInvoiceLineItem {
  id: string;
  user_key: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  position: number;
  created_at: string;
}

export interface DemoSavedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface DemoUserInvoiceSettings {
  user_key: string;
  from_name: string | null;
  from_email: string | null;
  from_address: string | null;
  default_tax_rate: number;
  default_terms: string | null;
  default_notes: string | null;
  invoice_prefix: string;
  next_invoice_seq: number;
  default_due_days: number | null;
  saved_line_items: DemoSavedLineItem[];
  created_at: string;
  updated_at: string;
}

export interface DemoReceipt {
  id: string;
  user_key: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  ocr_status: 'pending' | 'processed' | 'failed' | 'manual';
  ocr_merchant: string | null;
  ocr_amount: number | null;
  ocr_date: string | null;
  ocr_raw: unknown;
  transaction_id: string | null;
  match_confidence: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoTaxDocument {
  id: string;
  user_key: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  doc_type: 'w2' | '1099' | '1098' | 'receipt_summary' | 'return' | 'other';
  tax_year: number | null;
  issuer: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoPatMetadata {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export interface DemoAiStatus {
  configured: boolean;
  ai_enabled: boolean;
  share_merchant_names: boolean;
  share_transaction_notes: boolean;
}

export interface DemoState {
  schemaVersion: number;
  /** Bump this when seed/schema changes. */
  appDataVersion: string;
  userKey: string;
  data: {
    accounts: Account[];
    chart_of_accounts: Coa[];
    categories: Category[];
    transactions: Transaction[];
    recurring_transactions: Recurring[];
    audit_log: Array<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string; actor: string | null; user_key: string; before: unknown | null; after: unknown | null }>;

    // Phase 2 demo entities
    business_units: DemoBusinessUnit[];
    invoices: DemoInvoice[];
    invoice_line_items: DemoInvoiceLineItem[];
    invoice_templates: Array<{ id: string; user_key: string; name: string; tax_rate: number; terms: string | null; notes: string | null; line_items: DemoSavedLineItem[]; created_at: string; updated_at: string }>;
    user_invoice_settings: DemoUserInvoiceSettings | null;
    receipts: DemoReceipt[];
    tax_documents: DemoTaxDocument[];

    // Demo-only helpers
    obol_api_tokens: { tokens: DemoPatMetadata[] };
    ai: { status: DemoAiStatus };
    files: { metas: DemoFileMeta[] };
  };
}

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return ymd(d);
};
const monthsAgo = (months: number, day = 1) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months, day);
  return ymd(d);
};

export const DEFAULT_DEMO_STATE: DemoState = (() => {
  const userKey = 'demo-user';
  const created_at = nowIso();

  const accCheckingId = 'acc_demo_checking';
  const accCardId = 'acc_demo_card';
  const accSavingsId = 'acc_demo_savings';
  const accBrokerageId = 'acc_demo_brokerage';
  const accRetirementId = 'acc_demo_retirement';
  const accCashId = 'acc_demo_cash';

  const catMeals = 'cat_demo_meals';
  const catSoftware = 'cat_demo_software';
  const catTravel = 'cat_demo_travel';
  const catOffice = 'cat_demo_office';
  const catMarketing = 'cat_demo_marketing';
  const catPayroll = 'cat_demo_payroll';
  const catFees = 'cat_demo_fees';

  const coaCash = 'coa_demo_cash';
  const coaBank = 'coa_demo_bank';
  const coaSavings = 'coa_demo_savings';
  const coaInvestments = 'coa_demo_investments';
  const coaAccountsReceivable = 'coa_demo_ar';
  const coaAccountsPayable = 'coa_demo_ap';
  const coaEquity = 'coa_demo_equity';
  const coaMeals = 'coa_demo_meals';
  const coaSoftware = 'coa_demo_software';
  const coaTravel = 'coa_demo_travel';
  const coaOffice = 'coa_demo_office';
  const coaMarketing = 'coa_demo_marketing';
  const coaPayroll = 'coa_demo_payroll';
  const coaFees = 'coa_demo_fees';
  const coaTaxes = 'coa_demo_taxes';
  const coaIncome = 'coa_demo_income';

  const accounts: Account[] = [
    {
      id: accCheckingId,
      user_key: userKey,
      name: 'Demo Checking',
      type: 'checking',
      subtype: null,
      currency: 'USD',
      opening_balance: 4200,
      institution: 'Obol Bank',
      last4: '1234',
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: accSavingsId,
      user_key: userKey,
      name: 'High-Yield Savings',
      type: 'savings',
      subtype: 'high_yield',
      currency: 'USD',
      opening_balance: 12000,
      institution: 'Obol Bank',
      last4: '5555',
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: accCardId,
      user_key: userKey,
      name: 'Demo Card',
      type: 'credit_card',
      subtype: null,
      currency: 'USD',
      opening_balance: 0,
      institution: 'Obol Card',
      last4: '9876',
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: accBrokerageId,
      user_key: userKey,
      name: 'Brokerage (Taxable)',
      type: 'investment',
      subtype: 'brokerage',
      currency: 'USD',
      opening_balance: 18500,
      institution: 'Obol Investments',
      last4: '2244',
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: accRetirementId,
      user_key: userKey,
      name: 'SEP IRA',
      type: 'investment',
      subtype: 'sep_ira',
      currency: 'USD',
      opening_balance: 42000,
      institution: 'Obol Investments',
      last4: '7700',
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: accCashId,
      user_key: userKey,
      name: 'Petty Cash',
      type: 'cash',
      subtype: null,
      currency: 'USD',
      opening_balance: 200,
      institution: null,
      last4: null,
      archived: false,
      created_at,
      updated_at: created_at,
    },
  ];

  const chart_of_accounts: Coa[] = [
    {
      id: coaCash,
      user_key: userKey,
      code: '1000',
      name: 'Cash',
      description: 'Cash and cash equivalents',
      type: 'asset',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: true,
      plaid_keywords: null,
      created_at,
      updated_at: created_at,
    },
    {
      id: coaBank,
      user_key: userKey,
      code: '1010',
      name: 'Bank accounts',
      description: 'Checking and operating cash',
      type: 'asset',
      subtype: null,
      parent_id: coaCash,
      is_active: true,
      is_system: false,
      plaid_keywords: ['checking', 'bank'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaSavings,
      user_key: userKey,
      code: '1020',
      name: 'Savings',
      description: 'High-yield savings and reserves',
      type: 'asset',
      subtype: null,
      parent_id: coaCash,
      is_active: true,
      is_system: false,
      plaid_keywords: ['savings', 'hysa'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaInvestments,
      user_key: userKey,
      code: '1500',
      name: 'Investments',
      description: 'Brokerage and retirement accounts',
      type: 'asset',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['brokerage', 'ira', 'investment'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaAccountsReceivable,
      user_key: userKey,
      code: '1200',
      name: 'Accounts receivable',
      description: 'Outstanding invoices',
      type: 'asset',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['ar', 'accounts receivable', 'invoice'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaAccountsPayable,
      user_key: userKey,
      code: '2000',
      name: 'Accounts payable',
      description: 'Bills due to vendors',
      type: 'liability',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['ap', 'accounts payable'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaEquity,
      user_key: userKey,
      code: '3000',
      name: 'Owner equity',
      description: 'Owner contributions and draws',
      type: 'equity',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['draw', 'owner', 'equity'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaIncome,
      user_key: userKey,
      code: '4000',
      name: 'Client revenue',
      description: 'Invoices and client work',
      type: 'income',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['stripe', 'invoice', 'client'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaFees,
      user_key: userKey,
      code: '6050',
      name: 'Bank & payment fees',
      description: 'Card processing and bank fees',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['fee', 'processing', 'stripe'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaMeals,
      user_key: userKey,
      code: '6100',
      name: 'Meals',
      description: 'Meals and coffee while working',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['coffee', 'restaurant', 'cafe'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaSoftware,
      user_key: userKey,
      code: '6200',
      name: 'Software',
      description: 'SaaS subscriptions',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['github', 'vercel', 'notion', 'slack'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaOffice,
      user_key: userKey,
      code: '6250',
      name: 'Office supplies',
      description: 'Stationery, supplies, and small equipment',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['staples', 'office depot', 'supplies'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaTravel,
      user_key: userKey,
      code: '6300',
      name: 'Travel',
      description: 'Flights, lodging, rides',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['uber', 'lyft', 'airbnb', 'hotel'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaMarketing,
      user_key: userKey,
      code: '6400',
      name: 'Marketing',
      description: 'Ads, sponsorships, and marketing tools',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['google ads', 'twitter', 'linkedin', 'ads'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaPayroll,
      user_key: userKey,
      code: '6500',
      name: 'Contractors & payroll',
      description: 'Contractors, payroll, and HR expenses',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['payroll', 'gusto', 'contractor'],
      created_at,
      updated_at: created_at,
    },
    {
      id: coaTaxes,
      user_key: userKey,
      code: '6600',
      name: 'Taxes & licenses',
      description: 'Business taxes, licenses, and government fees',
      type: 'expense',
      subtype: null,
      parent_id: null,
      is_active: true,
      is_system: false,
      plaid_keywords: ['tax', 'license', 'irs'],
      created_at,
      updated_at: created_at,
    },
  ];

  const categories: Category[] = [
    {
      id: catMeals,
      user_key: userKey,
      name: 'Meals',
      color: '#f59e0b',
      type: 'expense',
      tax_deductible: true,
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: catSoftware,
      user_key: userKey,
      name: 'Software',
      color: '#3b82f6',
      type: 'expense',
      tax_deductible: true,
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: catTravel,
      user_key: userKey,
      name: 'Travel',
      color: '#10b981',
      type: 'expense',
      tax_deductible: true,
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: catOffice,
      user_key: userKey,
      name: 'Office',
      color: '#a855f7',
      type: 'expense',
      tax_deductible: true,
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: catMarketing,
      user_key: userKey,
      name: 'Marketing',
      color: '#06b6d4',
      type: 'expense',
      tax_deductible: true,
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: catPayroll,
      user_key: userKey,
      name: 'Payroll',
      color: '#ef4444',
      type: 'expense',
      tax_deductible: false,
      archived: false,
      created_at,
      updated_at: created_at,
    },
    {
      id: catFees,
      user_key: userKey,
      name: 'Fees',
      color: '#64748b',
      type: 'expense',
      tax_deductible: true,
      archived: false,
      created_at,
      updated_at: created_at,
    },
  ];

  const txnBase = (t: Omit<Transaction, 'user_key' | 'created_at' | 'updated_at'>): Transaction => ({
    ...t,
    user_key: userKey,
    created_at,
    updated_at: created_at,
  });

  const transferPair = (args: {
    id: string;
    date: string;
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    memo: string;
    status: 'pending' | 'cleared' | 'reconciled' | 'void';
  }): Transaction[] => {
    const pairId = `xfer_${args.id}`;
    return [
      txnBase({
        id: `txn_demo_xfer_${args.id}_out`,
        business_unit_id: null,
        txn_date: args.date,
        description: args.memo,
        merchant: null,
        amount: -Math.abs(args.amount),
        type: 'transfer',
        status: args.status,
        category_id: null,
        account_id: args.fromAccountId,
        coa_id: coaCash,
        tax_deductible: false,
        notes: null,
        transfer_pair_id: pairId,
        recurring_id: null,
      }),
      txnBase({
        id: `txn_demo_xfer_${args.id}_in`,
        business_unit_id: null,
        txn_date: args.date,
        description: args.memo,
        merchant: null,
        amount: Math.abs(args.amount),
        type: 'transfer',
        status: args.status,
        category_id: null,
        account_id: args.toAccountId,
        coa_id: coaCash,
        tax_deductible: false,
        notes: null,
        transfer_pair_id: pairId,
        recurring_id: null,
      }),
    ];
  };

  // 50 transactions across days/weeks/months (mix of income/expense/transfer; pending + cleared).
  const transactions: Transaction[] = [
    // Recent activity (last 2 weeks)
    txnBase({
      id: 'txn_demo_income_ach_1',
      business_unit_id: null,
      txn_date: today(),
      description: 'Client invoice INV-1001',
      merchant: 'Acme Co.',
      amount: 2500,
      type: 'income',
      status: 'cleared',
      category_id: null,
      account_id: accCheckingId,
      coa_id: coaIncome,
      tax_deductible: false,
      notes: 'Paid via ACH',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_coffee_1',
      business_unit_id: null,
      txn_date: today(),
      description: 'Coffee meeting',
      merchant: 'Downtown Cafe',
      amount: -12.45,
      type: 'expense',
      status: 'cleared',
      category_id: catMeals,
      account_id: accCardId,
      coa_id: coaMeals,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_vercel_1',
      business_unit_id: null,
      txn_date: daysAgo(1),
      description: 'SaaS subscription',
      merchant: 'Vercel',
      amount: -20,
      type: 'expense',
      status: 'cleared',
      category_id: catSoftware,
      account_id: accCardId,
      coa_id: coaSoftware,
      tax_deductible: true,
      notes: 'Monthly plan',
      transfer_pair_id: null,
      recurring_id: 'rec_demo_vercel',
    }),
    txnBase({
      id: 'txn_demo_exp_slack_1',
      business_unit_id: null,
      txn_date: daysAgo(2),
      description: 'Team chat',
      merchant: 'Slack',
      amount: -14,
      type: 'expense',
      status: 'cleared',
      category_id: catSoftware,
      account_id: accCardId,
      coa_id: coaSoftware,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_office_1',
      business_unit_id: null,
      txn_date: daysAgo(3),
      description: 'Notebooks & supplies',
      merchant: 'Staples',
      amount: -38.21,
      type: 'expense',
      status: 'cleared',
      category_id: catOffice,
      account_id: accCardId,
      coa_id: coaOffice,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_fee_1',
      business_unit_id: null,
      txn_date: daysAgo(4),
      description: 'Payment processing fee',
      merchant: 'Stripe',
      amount: -22.18,
      type: 'expense',
      status: 'cleared',
      category_id: catFees,
      account_id: accCheckingId,
      coa_id: coaFees,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_meal_2',
      business_unit_id: null,
      txn_date: daysAgo(5),
      description: 'Lunch with client',
      merchant: 'Saffron Kitchen',
      amount: -46.9,
      type: 'expense',
      status: 'cleared',
      category_id: catMeals,
      account_id: accCardId,
      coa_id: coaMeals,
      tax_deductible: true,
      notes: 'Discussed project scope',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_ads_1',
      business_unit_id: null,
      txn_date: daysAgo(6),
      description: 'Campaign spend',
      merchant: 'Google Ads',
      amount: -120,
      type: 'expense',
      status: 'pending',
      category_id: catMarketing,
      account_id: accCardId,
      coa_id: coaMarketing,
      tax_deductible: true,
      notes: 'May campaign',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    ...transferPair({
      id: '001',
      date: daysAgo(7),
      amount: 800,
      fromAccountId: accCheckingId,
      toAccountId: accSavingsId,
      memo: 'Transfer to savings',
      status: 'cleared',
    }),
    txnBase({
      id: 'txn_demo_income_stripe_1',
      business_unit_id: null,
      txn_date: daysAgo(8),
      description: 'Invoice payment',
      merchant: 'Nimbus Labs',
      amount: 1800,
      type: 'income',
      status: 'cleared',
      category_id: null,
      account_id: accCheckingId,
      coa_id: coaIncome,
      tax_deductible: false,
      notes: 'Card payment',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_uber_1',
      business_unit_id: null,
      txn_date: daysAgo(9),
      description: 'Ride to client site',
      merchant: 'Uber',
      amount: -24.32,
      type: 'expense',
      status: 'cleared',
      category_id: catTravel,
      account_id: accCardId,
      coa_id: coaTravel,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_airbnb_1',
      business_unit_id: null,
      txn_date: daysAgo(11),
      description: 'Lodging (work trip)',
      merchant: 'Airbnb',
      amount: -312.77,
      type: 'expense',
      status: 'cleared',
      category_id: catTravel,
      account_id: accCardId,
      coa_id: coaTravel,
      tax_deductible: true,
      notes: '2 nights',
      transfer_pair_id: null,
      recurring_id: null,
    }),

    // Prior months (mix of recurring + one-offs)
    txnBase({
      id: 'txn_demo_exp_notions_1',
      business_unit_id: null,
      txn_date: monthsAgo(1, 14),
      description: 'Workspace plan',
      merchant: 'Notion',
      amount: -10,
      type: 'expense',
      status: 'cleared',
      category_id: catSoftware,
      account_id: accCardId,
      coa_id: coaSoftware,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_domain_1',
      business_unit_id: null,
      txn_date: monthsAgo(1, 2),
      description: 'Domain renewal',
      merchant: 'Namecheap',
      amount: -18.99,
      type: 'expense',
      status: 'cleared',
      category_id: catSoftware,
      account_id: accCardId,
      coa_id: coaSoftware,
      tax_deductible: true,
      notes: 'Annual',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_meal_3',
      business_unit_id: null,
      txn_date: monthsAgo(1, 21),
      description: 'Team lunch',
      merchant: 'Green Fork',
      amount: -72.14,
      type: 'expense',
      status: 'cleared',
      category_id: catMeals,
      account_id: accCardId,
      coa_id: coaMeals,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    ...transferPair({
      id: '002',
      date: monthsAgo(1, 28),
      amount: 1500,
      fromAccountId: accCheckingId,
      toAccountId: accBrokerageId,
      memo: 'Transfer to brokerage',
      status: 'cleared',
    }),
    txnBase({
      id: 'txn_demo_income_2',
      business_unit_id: null,
      txn_date: monthsAgo(2, 8),
      description: 'Client retainer',
      merchant: 'Acme Co.',
      amount: 2500,
      type: 'income',
      status: 'cleared',
      category_id: null,
      account_id: accCheckingId,
      coa_id: coaIncome,
      tax_deductible: false,
      notes: 'Monthly retainer',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_tax_1',
      business_unit_id: null,
      txn_date: monthsAgo(2, 15),
      description: 'Quarterly estimated tax',
      merchant: 'US Treasury',
      amount: -950,
      type: 'expense',
      status: 'cleared',
      category_id: null,
      account_id: accCheckingId,
      coa_id: coaTaxes,
      tax_deductible: false,
      notes: 'Estimated payment',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_marketing_2',
      business_unit_id: null,
      txn_date: monthsAgo(2, 20),
      description: 'Sponsor placement',
      merchant: 'Newsletter Co.',
      amount: -300,
      type: 'expense',
      status: 'cleared',
      category_id: catMarketing,
      account_id: accCardId,
      coa_id: coaMarketing,
      tax_deductible: true,
      notes: null,
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_payroll_1',
      business_unit_id: null,
      txn_date: monthsAgo(3, 1),
      description: 'Contractor payment',
      merchant: 'Freelancer A',
      amount: -1200,
      type: 'expense',
      status: 'cleared',
      category_id: catPayroll,
      account_id: accCheckingId,
      coa_id: coaPayroll,
      tax_deductible: false,
      notes: 'Design work',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_exp_payroll_2',
      business_unit_id: null,
      txn_date: monthsAgo(3, 15),
      description: 'Contractor payment',
      merchant: 'Freelancer B',
      amount: -900,
      type: 'expense',
      status: 'cleared',
      category_id: catPayroll,
      account_id: accCheckingId,
      coa_id: coaPayroll,
      tax_deductible: false,
      notes: 'Engineering support',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    txnBase({
      id: 'txn_demo_income_3',
      business_unit_id: null,
      txn_date: monthsAgo(3, 6),
      description: 'Project milestone',
      merchant: 'Nimbus Labs',
      amount: 3200,
      type: 'income',
      status: 'cleared',
      category_id: null,
      account_id: accCheckingId,
      coa_id: coaIncome,
      tax_deductible: false,
      notes: 'Milestone 2',
      transfer_pair_id: null,
      recurring_id: null,
    }),
    ...transferPair({
      id: '003',
      date: monthsAgo(3, 22),
      amount: 2000,
      fromAccountId: accCheckingId,
      toAccountId: accRetirementId,
      memo: 'Transfer to SEP IRA',
      status: 'cleared',
    }),

    // Fillers to reach 50: small, realistic daily spend + occasional income
    ...[
      { d: 12, m: 'Blue Bottle', a: -8.5, c: catMeals, coa: coaMeals, acct: accCardId, desc: 'Coffee' },
      { d: 13, m: 'Chipotle', a: -14.22, c: catMeals, coa: coaMeals, acct: accCardId, desc: 'Lunch' },
      { d: 14, m: 'GitHub', a: -7, c: catSoftware, coa: coaSoftware, acct: accCardId, desc: 'Team plan' },
      { d: 16, m: 'Amazon', a: -56.19, c: catOffice, coa: coaOffice, acct: accCardId, desc: 'Office supplies' },
      { d: 18, m: 'United', a: -248.33, c: catTravel, coa: coaTravel, acct: accCardId, desc: 'Flight' },
      { d: 19, m: 'Lyft', a: -18.41, c: catTravel, coa: coaTravel, acct: accCardId, desc: 'Ride' },
      { d: 23, m: 'Figma', a: -15, c: catSoftware, coa: coaSoftware, acct: accCardId, desc: 'Design tool' },
      { d: 26, m: 'Stripe', a: -9.12, c: catFees, coa: coaFees, acct: accCheckingId, desc: 'Processing fee' },
      { d: 31, m: 'Acme Co.', a: 2500, c: null, coa: coaIncome, acct: accCheckingId, desc: 'Client retainer' },
      { d: 35, m: 'Adobe', a: -22.99, c: catSoftware, coa: coaSoftware, acct: accCardId, desc: 'Creative Cloud' },
      { d: 41, m: 'Office Depot', a: -29.4, c: catOffice, coa: coaOffice, acct: accCardId, desc: 'Printer ink' },
      { d: 47, m: 'Hilton', a: -189.22, c: catTravel, coa: coaTravel, acct: accCardId, desc: 'Hotel' },
      { d: 55, m: 'Twitter', a: -60, c: catMarketing, coa: coaMarketing, acct: accCardId, desc: 'Ads spend' },
      { d: 63, m: 'Acme Co.', a: 1200, c: null, coa: coaIncome, acct: accCheckingId, desc: 'Small project' },
      { d: 70, m: 'IRS', a: -150, c: null, coa: coaTaxes, acct: accCheckingId, desc: 'License fee' },
      { d: 78, m: 'DoorDash', a: -27.8, c: catMeals, coa: coaMeals, acct: accCardId, desc: 'Dinner' },
      { d: 85, m: 'Uber', a: -21.11, c: catTravel, coa: coaTravel, acct: accCardId, desc: 'Ride' },
      { d: 92, m: 'Acme Co.', a: 2500, c: null, coa: coaIncome, acct: accCheckingId, desc: 'Client retainer' },
      { d: 105, m: 'Notion', a: -10, c: catSoftware, coa: coaSoftware, acct: accCardId, desc: 'Workspace plan' },
      { d: 120, m: 'Gusto', a: -180, c: catPayroll, coa: coaPayroll, acct: accCheckingId, desc: 'Payroll fees' },
      { d: 135, m: 'Green Fork', a: -33.75, c: catMeals, coa: coaMeals, acct: accCardId, desc: 'Lunch' },
      { d: 150, m: 'AWS', a: -43.28, c: catSoftware, coa: coaSoftware, acct: accCardId, desc: 'Cloud usage' },
      { d: 165, m: 'Client A', a: 900, c: null, coa: coaIncome, acct: accCheckingId, desc: 'Invoice payment' },
      { d: 180, m: 'Acme Co.', a: 2500, c: null, coa: coaIncome, acct: accCheckingId, desc: 'Client retainer' },
      { d: 200, m: 'Staples', a: -18.1, c: catOffice, coa: coaOffice, acct: accCardId, desc: 'Supplies' },
      { d: 220, m: 'Saffron Kitchen', a: -58.66, c: catMeals, coa: coaMeals, acct: accCardId, desc: 'Client lunch' },
      { d: 240, m: 'Vercel', a: -20, c: catSoftware, coa: coaSoftware, acct: accCardId, desc: 'SaaS subscription' },
      { d: 265, m: 'Airbnb', a: -280.1, c: catTravel, coa: coaTravel, acct: accCardId, desc: 'Lodging' },
      { d: 300, m: 'Client B', a: 3100, c: null, coa: coaIncome, acct: accCheckingId, desc: 'Project deposit' },
      { d: 330, m: 'Stripe', a: -19.55, c: catFees, coa: coaFees, acct: accCheckingId, desc: 'Processing fee' },
    ].map((row, idx) =>
      txnBase({
        id: `txn_demo_bulk_${String(idx + 1).padStart(2, '0')}`,
        business_unit_id: null,
        txn_date: daysAgo(row.d),
        description: row.desc,
        merchant: row.m,
        amount: row.a,
        type: row.a >= 0 ? 'income' : 'expense',
        status: row.d < 10 ? 'pending' : 'cleared',
        category_id: row.a >= 0 ? null : (row.c as string | null),
        account_id: row.acct,
        coa_id: row.coa,
        tax_deductible: row.a < 0 && row.coa !== coaTaxes,
        notes: null,
        transfer_pair_id: null,
        recurring_id: row.m === 'Vercel' ? 'rec_demo_vercel' : null,
      }),
    ),
  ].slice(0, 50);

  const recurring_transactions: Recurring[] = [
    {
      id: 'rec_demo_vercel',
      user_key: userKey,
      business_unit_id: null,
      description: 'Vercel',
      amount: -20,
      type: 'expense',
      account_id: accCardId,
      category_id: catSoftware,
      coa_id: coaSoftware,
      cadence: 'monthly',
      next_run: today(),
      end_date: null,
      active: true,
      notes: null,
      created_at,
      updated_at: created_at,
    },
  ];

  const business_units: DemoBusinessUnit[] = [
    {
      id: 'bu_demo_main',
      user_key: userKey,
      name: 'Main',
      description: 'Primary business unit',
      color: '#6366f1',
      archived: false,
      created_at,
      updated_at: created_at,
    },
  ];

  const invoice_settings: DemoUserInvoiceSettings = {
    user_key: userKey,
    from_name: 'Demo LLC',
    from_email: 'billing@demo.co',
    from_address: '123 Demo Street\nDemo City, CA 94105',
    default_tax_rate: 0,
    default_terms: 'Net 14',
    default_notes: 'Thank you for your business!',
    invoice_prefix: 'INV-',
    next_invoice_seq: 1010,
    default_due_days: 14,
    saved_line_items: [
      { description: 'Consulting', quantity: 1, unit_price: 2500 },
      { description: 'Implementation', quantity: 1, unit_price: 1800 },
      { description: 'Support retainer', quantity: 1, unit_price: 900 },
    ],
    created_at,
    updated_at: created_at,
  };

  const invoices: DemoInvoice[] = [
    {
      id: 'inv_demo_1001',
      user_key: userKey,
      business_unit_id: 'bu_demo_main',
      invoice_number: 'INV-1001',
      status: 'paid',
      issue_date: daysAgo(8),
      due_date: daysAgo(8 - 14),
      paid_date: daysAgo(6),
      client_name: 'Acme Co.',
      client_email: 'ap@acme.co',
      client_address: null,
      from_name: invoice_settings.from_name,
      from_email: invoice_settings.from_email,
      from_address: invoice_settings.from_address,
      currency: 'USD',
      subtotal: 2500,
      tax_rate: 0,
      tax_amount: 0,
      total: 2500,
      notes: invoice_settings.default_notes,
      terms: invoice_settings.default_terms,
      created_at,
      updated_at: created_at,
    },
    {
      id: 'inv_demo_1002',
      user_key: userKey,
      business_unit_id: 'bu_demo_main',
      invoice_number: 'INV-1002',
      status: 'sent',
      issue_date: daysAgo(3),
      due_date: daysAgo(3 - 14),
      paid_date: null,
      client_name: 'Nimbus Labs',
      client_email: 'finance@nimbus.io',
      client_address: '10 Market St\nSan Francisco, CA',
      from_name: invoice_settings.from_name,
      from_email: invoice_settings.from_email,
      from_address: invoice_settings.from_address,
      currency: 'USD',
      subtotal: 1800,
      tax_rate: 0,
      tax_amount: 0,
      total: 1800,
      notes: 'Thank you — please remit by ACH.',
      terms: invoice_settings.default_terms,
      created_at,
      updated_at: created_at,
    },
    {
      id: 'inv_demo_1003',
      user_key: userKey,
      business_unit_id: 'bu_demo_main',
      invoice_number: 'INV-1003',
      status: 'overdue',
      issue_date: monthsAgo(1, 5),
      due_date: monthsAgo(1, 19),
      paid_date: null,
      client_name: 'Beacon Studio',
      client_email: 'billing@beacon.studio',
      client_address: null,
      from_name: invoice_settings.from_name,
      from_email: invoice_settings.from_email,
      from_address: invoice_settings.from_address,
      currency: 'USD',
      subtotal: 900,
      tax_rate: 0,
      tax_amount: 0,
      total: 900,
      notes: 'Reminder: invoice past due.',
      terms: 'Net 14',
      created_at,
      updated_at: created_at,
    },
    {
      id: 'inv_demo_1004',
      user_key: userKey,
      business_unit_id: 'bu_demo_main',
      invoice_number: 'INV-1004',
      status: 'draft',
      issue_date: today(),
      due_date: null,
      paid_date: null,
      client_name: 'Pinecone Partners',
      client_email: null,
      client_address: null,
      from_name: invoice_settings.from_name,
      from_email: invoice_settings.from_email,
      from_address: invoice_settings.from_address,
      currency: 'USD',
      subtotal: 3200,
      tax_rate: 0,
      tax_amount: 0,
      total: 3200,
      notes: 'Draft — finalize scope before sending.',
      terms: invoice_settings.default_terms,
      created_at,
      updated_at: created_at,
    },
  ];

  const invoice_line_items: DemoInvoiceLineItem[] = [
    {
      id: 'invli_demo_1',
      user_key: userKey,
      invoice_id: 'inv_demo_1001',
      description: 'Consulting services',
      quantity: 1,
      unit_price: 2500,
      amount: 2500,
      position: 1,
      created_at,
    },
    {
      id: 'invli_demo_2',
      user_key: userKey,
      invoice_id: 'inv_demo_1002',
      description: 'Implementation (Phase 1)',
      quantity: 1,
      unit_price: 1800,
      amount: 1800,
      position: 1,
      created_at,
    },
    {
      id: 'invli_demo_3',
      user_key: userKey,
      invoice_id: 'inv_demo_1003',
      description: 'Support retainer',
      quantity: 1,
      unit_price: 900,
      amount: 900,
      position: 1,
      created_at,
    },
    {
      id: 'invli_demo_4',
      user_key: userKey,
      invoice_id: 'inv_demo_1004',
      description: 'Project milestone delivery',
      quantity: 1,
      unit_price: 3200,
      amount: 3200,
      position: 1,
      created_at,
    },
  ];

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    appDataVersion: 'demo-data-v2',
    userKey,
    data: {
      accounts,
      chart_of_accounts,
      categories,
      transactions,
      recurring_transactions,
      audit_log: [],
      business_units,
      invoices,
      invoice_line_items,
      invoice_templates: [],
      user_invoice_settings: invoice_settings,
      receipts: [],
      tax_documents: [],
      obol_api_tokens: { tokens: [] },
      ai: {
        status: {
          configured: false,
          ai_enabled: false,
          share_merchant_names: false,
          share_transaction_notes: false,
        },
      },
      files: { metas: [] },
    },
  };
})();

