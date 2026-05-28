import type { Invoice } from '@/lib/api2';
import { formatDateInput } from '@/lib/format';

export interface DraftItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceClient {
  name: string;
  email: string;
  address: string;
}

export interface InvoiceFormState {
  invoiceNumber: string;
  businessUnitId: string;
  status: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  taxRate: number;
  notes: string;
  terms: string;
  items: DraftItem[];
}

const DRAFT_KEY = 'obol-invoice-draft';

export function extractClientsFromInvoices(invoices: Invoice[]): InvoiceClient[] {
  const map = new Map<string, InvoiceClient>();
  for (const inv of invoices) {
    const key = inv.client_name.trim().toLowerCase();
    if (!key || map.has(key)) continue;
    map.set(key, {
      name: inv.client_name,
      email: inv.client_email ?? '',
      address: inv.client_address ?? '',
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function collectLineItemSuggestions(invoices: Invoice[], saved: DraftItem[]): string[] {
  const set = new Set<string>();
  for (const item of saved) {
    if (item.description.trim()) set.add(item.description.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function addDaysToDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}

export function computeDueDateFromIssue(issueDate: string, dueDays: number | null | undefined): string {
  if (!dueDays || dueDays <= 0) return '';
  return addDaysToDate(issueDate, dueDays);
}

export interface InvoiceValidation {
  valid: boolean;
  errors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInvoiceForm(
  state: Pick<
    InvoiceFormState,
    'invoiceNumber' | 'clientName' | 'clientEmail' | 'issueDate' | 'dueDate' | 'items'
  >,
): InvoiceValidation {
  const errors: string[] = [];
  if (!state.invoiceNumber.trim()) errors.push('Invoice number is required.');
  if (!state.clientName.trim()) errors.push('Client name is required.');
  if (state.clientEmail.trim() && !EMAIL_RE.test(state.clientEmail.trim())) {
    errors.push('Client email format looks invalid.');
  }
  if (state.dueDate && state.issueDate && state.dueDate < state.issueDate) {
    errors.push('Due date must be on or after the issue date.');
  }
  const filledItems = state.items.filter((it) => it.description.trim());
  if (filledItems.length === 0) {
    errors.push('Add at least one line item with a description.');
  } else {
    const hasAmount = filledItems.some(
      (it) => (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) > 0,
    );
    if (!hasAmount) errors.push('At least one line item needs a quantity and unit price.');
  }
  return { valid: errors.length === 0, errors };
}

export function formStateSnapshot(state: InvoiceFormState): string {
  return JSON.stringify(state);
}

export function saveDraftToStorage(state: InvoiceFormState, editingId: string | null): void {
  if (editingId) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), state }));
  } catch {
    /* ignore quota */
  }
}

export function loadDraftFromStorage(): InvoiceFormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: InvoiceFormState };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

export function clearDraftStorage(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasDraftInStorage(): boolean {
  try {
    return !!localStorage.getItem(DRAFT_KEY);
  } catch {
    return false;
  }
}

export const EMPTY_ITEM: DraftItem = { description: '', quantity: 1, unit_price: 0 };

export function defaultFormState(): InvoiceFormState {
  return {
    invoiceNumber: '',
    businessUnitId: 'none',
    status: 'draft',
    issueDate: formatDateInput(),
    dueDate: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    fromName: '',
    fromEmail: '',
    fromAddress: '',
    taxRate: 0,
    notes: '',
    terms: '',
    items: [{ ...EMPTY_ITEM }],
  };
}
