// Demo API helpers for Phase 2 entities (business units, invoices, receipts, tax docs).
import { demoUuid, getDemoState, mutateDemoState } from '@/demo/store';

// ============== BUSINESS UNITS ==============
export interface BusinessUnit {
  id: string;
  user_key: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
export async function listBusinessUnits(): Promise<BusinessUnit[]> {
  const s = getDemoState();
  return [...s.data.business_units].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}
export async function createBusinessUnit(values: { name: string; description?: string | null; color?: string }): Promise<BusinessUnit> {
  const userKey = getDemoState().userKey;
  const created_at = new Date().toISOString();
  const row: BusinessUnit = {
    id: demoUuid('bu'),
    user_key: userKey,
    name: values.name,
    description: values.description ?? null,
    color: values.color ?? '#6366f1',
    archived: false,
    created_at,
    updated_at: created_at,
  };
  mutateDemoState((d) => {
    d.data.business_units.push(row);
  });
  return row;
}
export async function updateBusinessUnit(id: string, patch: Partial<BusinessUnit>): Promise<BusinessUnit> {
  const s = getDemoState();
  const before = s.data.business_units.find((b) => b.id === id);
  if (!before) throw new Error('Business unit not found');
  const updated: BusinessUnit = { ...before, ...patch, id: before.id, user_key: before.user_key, updated_at: new Date().toISOString() };
  mutateDemoState((d) => {
    d.data.business_units = d.data.business_units.map((b) => (b.id === id ? updated : b));
  });
  return updated;
}
export async function deleteBusinessUnit(id: string): Promise<void> {
  mutateDemoState((d) => {
    d.data.business_units = d.data.business_units.filter((b) => b.id !== id);
  });
}

// ============== INVOICES ==============
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export interface Invoice {
  id: string;
  user_key: string;
  business_unit_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
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
export interface InvoiceLineItem {
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
export async function listInvoices(): Promise<Invoice[]> {
  const s = getDemoState();
  return [...s.data.invoices].sort((a, b) => (a.issue_date < b.issue_date ? 1 : -1));
}
export async function getInvoice(id: string): Promise<Invoice | null> {
  const s = getDemoState();
  return s.data.invoices.find((i) => i.id === id) ?? null;
}
export async function listInvoiceItems(invoice_id: string): Promise<InvoiceLineItem[]> {
  const s = getDemoState();
  return (s.data.invoice_line_items ?? [])
    .filter((it) => it.invoice_id === invoice_id)
    .sort((a, b) => a.position - b.position);
}
export async function createInvoice(values: Partial<Invoice>): Promise<Invoice> {
  const userKey = getDemoState().userKey;
  const created_at = new Date().toISOString();
  const row: Invoice = {
    id: demoUuid('inv'),
    user_key: userKey,
    business_unit_id: values.business_unit_id ?? null,
    invoice_number: values.invoice_number ?? `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    status: values.status ?? 'draft',
    issue_date: values.issue_date ?? new Date().toISOString().slice(0, 10),
    due_date: values.due_date ?? null,
    paid_date: values.paid_date ?? null,
    client_name: values.client_name ?? 'Client',
    client_email: values.client_email ?? null,
    client_address: values.client_address ?? null,
    from_name: values.from_name ?? null,
    from_email: values.from_email ?? null,
    from_address: values.from_address ?? null,
    currency: values.currency ?? 'USD',
    subtotal: values.subtotal ?? 0,
    tax_rate: values.tax_rate ?? 0,
    tax_amount: values.tax_amount ?? 0,
    total: values.total ?? 0,
    notes: values.notes ?? null,
    terms: values.terms ?? null,
    created_at,
    updated_at: created_at,
  };
  mutateDemoState((d) => {
    d.data.invoices.push(row);
  });
  return row;
}
export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  const s = getDemoState();
  const before = s.data.invoices.find((i) => i.id === id);
  if (!before) throw new Error('Invoice not found');
  const updated: Invoice = { ...before, ...patch, id: before.id, user_key: before.user_key, updated_at: new Date().toISOString() };
  mutateDemoState((d) => {
    d.data.invoices = d.data.invoices.map((i) => (i.id === id ? updated : i));
  });
  return updated;
}
export async function deleteInvoice(id: string): Promise<void> {
  mutateDemoState((d) => {
    d.data.invoice_line_items = d.data.invoice_line_items.filter((it) => it.invoice_id !== id);
    d.data.invoices = d.data.invoices.filter((i) => i.id !== id);
  });
}
export async function createInvoiceItem(values: Partial<InvoiceLineItem>): Promise<InvoiceLineItem> {
  const userKey = getDemoState().userKey;
  const created_at = new Date().toISOString();
  const row: InvoiceLineItem = {
    id: demoUuid('invli'),
    user_key: userKey,
    invoice_id: values.invoice_id!,
    description: values.description ?? '',
    quantity: values.quantity ?? 1,
    unit_price: values.unit_price ?? 0,
    amount: values.amount ?? (values.quantity ?? 1) * (values.unit_price ?? 0),
    position: values.position ?? 1,
    created_at,
  };
  mutateDemoState((d) => {
    d.data.invoice_line_items.push(row);
  });
  return row;
}
export async function deleteInvoiceItem(id: string): Promise<void> {
  mutateDemoState((d) => {
    d.data.invoice_line_items = d.data.invoice_line_items.filter((it) => it.id !== id);
  });
}

export async function reserveInvoiceNumber(): Promise<string> {
  const s = getDemoState();
  const prefix = s.data.user_invoice_settings?.invoice_prefix ?? 'INV-';
  const next = s.data.user_invoice_settings?.next_invoice_seq ?? 1000;
  mutateDemoState((d) => {
    if (!d.data.user_invoice_settings) return;
    d.data.user_invoice_settings.next_invoice_seq = next + 1;
    d.data.user_invoice_settings.updated_at = new Date().toISOString();
  });
  return `${prefix}${next}`;
}

// ============== INVOICE SETTINGS ==============
export interface SavedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface UserInvoiceSettings {
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
  saved_line_items: SavedLineItem[];
  created_at: string;
  updated_at: string;
}

export async function getInvoiceSettings(): Promise<UserInvoiceSettings | null> {
  const s = getDemoState();
  const row = s.data.user_invoice_settings;
  if (!row) return null;
  return { ...row, saved_line_items: Array.isArray(row.saved_line_items) ? row.saved_line_items : [] } as UserInvoiceSettings;
}

export async function saveInvoiceSettings(
  patch: Partial<Omit<UserInvoiceSettings, 'user_key' | 'created_at' | 'updated_at'>>,
): Promise<UserInvoiceSettings> {
  const s = getDemoState();
  const userKey = s.userKey;
  const created_at = s.data.user_invoice_settings?.created_at ?? new Date().toISOString();
  const next: UserInvoiceSettings = {
    user_key: userKey,
    from_name: patch.from_name ?? s.data.user_invoice_settings?.from_name ?? null,
    from_email: patch.from_email ?? s.data.user_invoice_settings?.from_email ?? null,
    from_address: patch.from_address ?? s.data.user_invoice_settings?.from_address ?? null,
    default_tax_rate: patch.default_tax_rate ?? s.data.user_invoice_settings?.default_tax_rate ?? 0,
    default_terms: patch.default_terms ?? s.data.user_invoice_settings?.default_terms ?? null,
    default_notes: patch.default_notes ?? s.data.user_invoice_settings?.default_notes ?? null,
    invoice_prefix: patch.invoice_prefix ?? s.data.user_invoice_settings?.invoice_prefix ?? 'INV-',
    next_invoice_seq: s.data.user_invoice_settings?.next_invoice_seq ?? 1000,
    default_due_days: patch.default_due_days ?? s.data.user_invoice_settings?.default_due_days ?? null,
    saved_line_items: (patch.saved_line_items ?? s.data.user_invoice_settings?.saved_line_items ?? []) as SavedLineItem[],
    created_at,
    updated_at: new Date().toISOString(),
  };
  mutateDemoState((d) => {
    d.data.user_invoice_settings = next as unknown as (typeof d.data.user_invoice_settings);
  });
  return { ...next, saved_line_items: Array.isArray(next.saved_line_items) ? next.saved_line_items : [] };
}

// ============== INVOICE TEMPLATES ==============
export interface InvoiceTemplate {
  id: string;
  user_key: string;
  name: string;
  tax_rate: number;
  terms: string | null;
  notes: string | null;
  line_items: SavedLineItem[];
  created_at: string;
  updated_at: string;
}

export async function listInvoiceTemplates(): Promise<InvoiceTemplate[]> {
  const s = getDemoState();
  return (s.data.invoice_templates ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ ...t, line_items: Array.isArray(t.line_items) ? t.line_items : [] })) as InvoiceTemplate[];
}

export async function createInvoiceTemplate(values: {
  name: string;
  tax_rate?: number;
  terms?: string | null;
  notes?: string | null;
  line_items: SavedLineItem[];
}): Promise<InvoiceTemplate> {
  const s = getDemoState();
  const userKey = s.userKey;
  const created_at = new Date().toISOString();
  const row: InvoiceTemplate = {
    id: demoUuid('invtpl'),
    user_key: userKey,
    name: values.name,
    tax_rate: values.tax_rate ?? 0,
    terms: values.terms ?? null,
    notes: values.notes ?? null,
    line_items: values.line_items ?? [],
    created_at,
    updated_at: created_at,
  };
  mutateDemoState((d) => {
    d.data.invoice_templates.push(row as unknown as (typeof d.data.invoice_templates)[number]);
  });
  return row;
}

export async function deleteInvoiceTemplate(id: string): Promise<void> {
  mutateDemoState((d) => {
    d.data.invoice_templates = d.data.invoice_templates.filter((t) => t.id !== id);
  });
}

// ============== RECEIPTS ==============
export interface Receipt {
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
export async function listReceipts(): Promise<Receipt[]> {
  const s = getDemoState();
  return [...s.data.receipts].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) as Receipt[];
}
export async function createReceipt(values: Partial<Receipt>): Promise<Receipt> {
  const s = getDemoState();
  const created_at = new Date().toISOString();
  const row: Receipt = {
    id: demoUuid('rcpt'),
    user_key: s.userKey,
    storage_path: values.storage_path ?? '',
    file_name: values.file_name ?? 'receipt',
    mime_type: values.mime_type ?? null,
    file_size: values.file_size ?? null,
    ocr_status: values.ocr_status ?? 'manual',
    ocr_merchant: values.ocr_merchant ?? null,
    ocr_amount: values.ocr_amount ?? null,
    ocr_date: values.ocr_date ?? null,
    ocr_raw: values.ocr_raw ?? null,
    transaction_id: values.transaction_id ?? null,
    match_confidence: values.match_confidence ?? null,
    notes: values.notes ?? null,
    created_at,
    updated_at: created_at,
  };
  mutateDemoState((d) => {
    d.data.receipts.push(row as unknown as (typeof d.data.receipts)[number]);
  });
  return row;
}
export async function updateReceipt(id: string, patch: Partial<Receipt>): Promise<Receipt> {
  const s = getDemoState();
  const before = (s.data.receipts as Receipt[]).find((r) => r.id === id);
  if (!before) throw new Error('Receipt not found');
  const updated: Receipt = { ...before, ...patch, id: before.id, user_key: before.user_key, updated_at: new Date().toISOString() };
  mutateDemoState((d) => {
    d.data.receipts = (d.data.receipts as Receipt[]).map((r) => (r.id === id ? updated : r));
  });
  return updated;
}
export async function deleteReceipt(id: string): Promise<void> {
  mutateDemoState((d) => {
    d.data.receipts = (d.data.receipts as Receipt[]).filter((r) => r.id !== id);
  });
}

// ============== TAX DOCUMENTS ==============
export interface TaxDocument {
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
export async function listTaxDocuments(): Promise<TaxDocument[]> {
  const s = getDemoState();
  return [...s.data.tax_documents].sort((a, b) => {
    const ay = a.tax_year ?? 0;
    const by = b.tax_year ?? 0;
    if (ay !== by) return by - ay;
    return a.created_at < b.created_at ? 1 : -1;
  }) as TaxDocument[];
}
export async function createTaxDocument(values: Partial<TaxDocument>): Promise<TaxDocument> {
  const s = getDemoState();
  const created_at = new Date().toISOString();
  const row: TaxDocument = {
    id: demoUuid('taxdoc'),
    user_key: s.userKey,
    storage_path: values.storage_path ?? '',
    file_name: values.file_name ?? 'document',
    mime_type: values.mime_type ?? null,
    file_size: values.file_size ?? null,
    doc_type: values.doc_type ?? 'other',
    tax_year: values.tax_year ?? null,
    issuer: values.issuer ?? null,
    notes: values.notes ?? null,
    created_at,
    updated_at: created_at,
  };
  mutateDemoState((d) => {
    d.data.tax_documents.push(row as unknown as (typeof d.data.tax_documents)[number]);
  });
  return row;
}
export async function deleteTaxDocument(id: string): Promise<void> {
  mutateDemoState((d) => {
    d.data.tax_documents = (d.data.tax_documents as TaxDocument[]).filter((t) => t.id !== id);
  });
}
