import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Download, FileText, Copy, Search, ArrowUpDown,
  LayoutTemplate, RotateCcw,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClientAutocomplete } from '@/components/invoices/ClientAutocomplete';
import {
  listInvoices, createInvoice, updateInvoice, deleteInvoice,
  listInvoiceItems, createInvoiceItem, deleteInvoiceItem, getInvoice,
  listBusinessUnits, reserveInvoiceNumber, getInvoiceSettings,
  listInvoiceTemplates, createInvoiceTemplate,
  type InvoiceStatus, type Invoice, type InvoiceTemplate, type UserInvoiceSettings,
} from '@/lib/api2';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import {
  type DraftItem, type InvoiceFormState, extractClientsFromInvoices,
  collectLineItemSuggestions, addDaysToDate, computeDueDateFromIssue,
  validateInvoiceForm, formStateSnapshot, saveDraftToStorage, loadDraftFromStorage,
  clearDraftStorage, hasDraftInStorage, defaultFormState, EMPTY_ITEM,
} from '@/lib/invoiceHelpers';

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', sent: 'default', paid: 'outline', overdue: 'destructive', void: 'secondary',
};

type SortKey = 'issue_date' | 'due_date' | 'client_name' | 'total' | 'invoice_number';

function applySettingsToForm(
  base: InvoiceFormState,
  settings: UserInvoiceSettings | null | undefined,
  invoiceNumber: string,
): InvoiceFormState {
  if (!settings) return { ...base, invoiceNumber };
  const dueDate = computeDueDateFromIssue(base.issueDate, settings.default_due_days);
  const savedItems = settings.saved_line_items?.length
    ? settings.saved_line_items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
      }))
    : base.items;
  return {
    ...base,
    invoiceNumber,
    fromName: settings.from_name ?? '',
    fromEmail: settings.from_email ?? '',
    fromAddress: settings.from_address ?? '',
    taxRate: Number(settings.default_tax_rate) || 0,
    terms: settings.default_terms ?? '',
    notes: settings.default_notes ?? '',
    dueDate: dueDate || base.dueDate,
    items: savedItems.length ? savedItems : base.items,
  };
}

function invoiceToFormState(inv: Invoice, items: DraftItem[]): InvoiceFormState {
  return {
    invoiceNumber: inv.invoice_number,
    businessUnitId: inv.business_unit_id ?? 'none',
    status: inv.status,
    issueDate: inv.issue_date,
    dueDate: inv.due_date ?? '',
    clientName: inv.client_name,
    clientEmail: inv.client_email ?? '',
    clientAddress: inv.client_address ?? '',
    fromName: inv.from_name ?? '',
    fromEmail: inv.from_email ?? '',
    fromAddress: inv.from_address ?? '',
    taxRate: Number(inv.tax_rate) || 0,
    notes: inv.notes ?? '',
    terms: inv.terms ?? '',
    items: items.length ? items : [{ ...EMPTY_ITEM }],
  };
}

export default function Invoices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(defaultFormState);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [templateNameOpen, setTemplateNameOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listQ, setListQ] = useState('');
  const [listStatus, setListStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('issue_date');
  const [sortAsc, setSortAsc] = useState(false);

  const setField = useCallback(<K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: listInvoices });
  const { data: units = [] } = useQuery({ queryKey: ['business_units'], queryFn: listBusinessUnits });
  const { data: settings } = useQuery({ queryKey: ['invoice-settings'], queryFn: getInvoiceSettings });
  const { data: templates = [] } = useQuery({ queryKey: ['invoice-templates'], queryFn: listInvoiceTemplates });

  const clients = useMemo(() => extractClientsFromInvoices(invoices), [invoices]);
  const lineSuggestions = useMemo(
    () => collectLineItemSuggestions(invoices, settings?.saved_line_items ?? []),
    [invoices, settings?.saved_line_items],
  );

  const subtotal = form.items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0,
  );
  const taxAmount = subtotal * (Number(form.taxRate) || 0) / 100;
  const total = subtotal + taxAmount;
  const validation = useMemo(() => validateInvoiceForm(form), [form]);
  const isDirty = open && initialSnapshot !== '' && formStateSnapshot(form) !== initialSnapshot;

  const filteredInvoices = useMemo(() => {
    let rows = [...invoices];
    if (listStatus !== 'all') rows = rows.filter((i) => i.status === listStatus);
    if (listQ.trim()) {
      const q = listQ.trim().toLowerCase();
      rows = rows.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          i.client_name.toLowerCase().includes(q) ||
          (i.client_email?.toLowerCase().includes(q) ?? false),
      );
    }
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'client_name':
          cmp = a.client_name.localeCompare(b.client_name);
          break;
        case 'total':
          cmp = Number(a.total) - Number(b.total);
          break;
        case 'invoice_number':
          cmp = a.invoice_number.localeCompare(b.invoice_number);
          break;
        case 'due_date':
          cmp = (a.due_date ?? '').localeCompare(b.due_date ?? '');
          break;
        default:
          cmp = a.issue_date.localeCompare(b.issue_date);
      }
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [invoices, listQ, listStatus, sortKey, sortAsc]);

  function markSnapshot(state: InvoiceFormState) {
    setInitialSnapshot(formStateSnapshot(state));
  }

  async function startNewInvoice(prefill?: Partial<InvoiceFormState>) {
    setEditingId(null);
    let number = '';
    try {
      number = await reserveInvoiceNumber();
    } catch {
      number = `INV-${String(invoices.length + 1).padStart(4, '0')}`;
      toast.error('Could not reserve invoice number; using a fallback.');
    }
    const base = applySettingsToForm({ ...defaultFormState(), ...prefill }, settings, number);
    const draft = !prefill ? loadDraftFromStorage() : null;
    const next = draft ? { ...base, ...draft, invoiceNumber: number } : base;
    setForm(next);
    markSnapshot(next);
    setOpen(true);
  }

  async function loadForEdit(inv: Invoice) {
    setEditingId(inv.id);
    const its = await listInvoiceItems(inv.id);
    const state = invoiceToFormState(
      inv,
      its.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
    );
    setForm(state);
    markSnapshot(state);
    setOpen(true);
  }

  async function duplicateInvoice(inv: Invoice) {
    const its = await listInvoiceItems(inv.id);
    const items = its.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));
    await startNewInvoice({
      ...invoiceToFormState(inv, items),
      status: 'draft',
      issueDate: formatDateInput(),
      dueDate: computeDueDateFromIssue(formatDateInput(), settings?.default_due_days),
    });
    toast.success('Invoice duplicated — review and save.');
  }

  function loadFromTemplate(tpl: InvoiceTemplate) {
    const items = tpl.line_items?.length
      ? tpl.line_items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
        }))
      : [{ ...EMPTY_ITEM }];
    void startNewInvoice({
      taxRate: Number(tpl.tax_rate) || 0,
      terms: tpl.terms ?? '',
      notes: tpl.notes ?? '',
      items,
    });
    toast.success(`Loaded template “${tpl.name}”`);
  }

  function tryCloseDialog() {
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
    setEditingId(null);
    setForm(defaultFormState());
    setInitialSnapshot('');
  }

  function confirmDiscard() {
    setDiscardOpen(false);
    setOpen(false);
    setEditingId(null);
    setForm(defaultFormState());
    setInitialSnapshot('');
    if (!editingId) clearDraftStorage();
  }

  // Autosave draft for new invoices
  useEffect(() => {
    if (!open || editingId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveDraftToStorage(form, editingId), 800);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form, open, editingId]);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setForm((f) => {
      const items = f.items.map((x, j) => (j === index ? { ...x, ...patch } : x));
      const last = items[items.length - 1];
      if (last?.description.trim() && index === items.length - 1) {
        items.push({ ...EMPTY_ITEM });
      }
      return { ...f, items };
    });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!validation.valid) throw new Error(validation.errors[0]);
      const payload = {
        invoice_number: form.invoiceNumber,
        business_unit_id: form.businessUnitId === 'none' ? null : form.businessUnitId,
        status: form.status as InvoiceStatus,
        issue_date: form.issueDate,
        due_date: form.dueDate || null,
        client_name: form.clientName,
        client_email: form.clientEmail || null,
        client_address: form.clientAddress || null,
        from_name: form.fromName || null,
        from_email: form.fromEmail || null,
        from_address: form.fromAddress || null,
        currency: 'USD',
        subtotal,
        tax_rate: form.taxRate,
        tax_amount: taxAmount,
        total,
        notes: form.notes || null,
        terms: form.terms || null,
      };
      const inv = editingId
        ? await updateInvoice(editingId, payload)
        : await createInvoice(payload);
      if (editingId) {
        const existing = await listInvoiceItems(inv.id);
        for (const it of existing) await deleteInvoiceItem(it.id);
      }
      let pos = 0;
      for (const it of form.items) {
        if (!it.description.trim()) continue;
        await createInvoiceItem({
          invoice_id: inv.id,
          description: it.description,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          amount: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
          position: pos++,
        });
      }
      return inv;
    },
    onSuccess: () => {
      toast.success(editingId ? 'Invoice updated' : 'Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      clearDraftStorage();
      setOpen(false);
      setEditingId(null);
      setForm(defaultFormState());
      setInitialSnapshot('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTemplateMut = useMutation({
    mutationFn: async () => {
      const name = newTemplateName.trim();
      if (!name) throw new Error('Template name is required.');
      const lineItems = form.items
        .filter((it) => it.description.trim())
        .map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
        }));
      return createInvoiceTemplate({
        name,
        tax_rate: form.taxRate,
        terms: form.terms || null,
        notes: form.notes || null,
        line_items: lineItems.length ? lineItems : [{ description: 'Service', quantity: 1, unit_price: 0 }],
      });
    },
    onSuccess: (tpl) => {
      toast.success(`Template “${tpl.name}” saved`);
      qc.invalidateQueries({ queryKey: ['invoice-templates'] });
      setTemplateNameOpen(false);
      setNewTemplateName('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  async function handleDownload(inv: Invoice) {
    const [full, its] = await Promise.all([getInvoice(inv.id), listInvoiceItems(inv.id)]);
    if (!full) return;
    downloadInvoicePdf(full, its);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Invoices"
        description="Create, duplicate, and manage invoices with smart defaults."
        actions={
          <div className="flex flex-wrap gap-2">
            {hasDraftInStorage() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const draft = loadDraftFromStorage();
                  if (draft) {
                    void startNewInvoice(draft);
                    toast.message('Restored your saved draft');
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Resume draft
              </Button>
            )}
            {templates.length > 0 && (
              <Select onValueChange={(id) => {
                const tpl = templates.find((t) => t.id === id);
                if (tpl) loadFromTemplate(tpl);
              }}>
                <SelectTrigger className="w-[180px]">
                  <LayoutTemplate className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="From template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => void startNewInvoice()}>
              <Plus className="h-4 w-4" />New invoice
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Number, client, email…"
                value={listQ}
                onChange={(e) => setListQ(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1 w-[140px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={listStatus} onValueChange={setListStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(['draft', 'sent', 'paid', 'overdue', 'void'] as InvoiceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-[160px]">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="issue_date">Issue date</SelectItem>
                <SelectItem value="due_date">Due date</SelectItem>
                <SelectItem value="client_name">Client</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="invoice_number">Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={sortAsc ? 'Ascending' : 'Descending'}
            onClick={() => setSortAsc((a) => !a)}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
              No invoices yet. Set defaults in Settings, then create your first invoice.
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No invoices match your filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer" onClick={() => loadForEdit(inv)}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.issue_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[inv.status]}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm" variant="ghost" title="Duplicate"
                        onClick={() => void duplicateInvoice(inv)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Download PDF" onClick={() => handleDownload(inv)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => { if (confirm('Delete this invoice?')) deleteMut.mutate(inv.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!o) tryCloseDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit invoice' : 'New invoice'}</DialogTitle>
            <DialogDescription>
              {!editingId && 'Draft autosaves locally until you save.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Invoice #</Label>
                <Input value={form.invoiceNumber} onChange={(e) => setField('invoiceNumber', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['draft', 'sent', 'paid', 'overdue', 'void'] as InvoiceStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Issue date</Label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setField('issueDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
                <div className="flex gap-1 pt-1">
                  {[15, 30, 45, 60].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setField('dueDate', addDaysToDate(form.issueDate, days))}
                    >
                      Net {days}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Business unit</Label>
                <Select value={form.businessUnitId} onValueChange={(v) => setField('businessUnitId', v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {units.filter((u) => !u.archived).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">From</Label>
                <Input
                  placeholder="Your name / company"
                  value={form.fromName}
                  onChange={(e) => setField('fromName', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  value={form.fromEmail}
                  onChange={(e) => setField('fromEmail', e.target.value)}
                />
                <Textarea
                  rows={2}
                  placeholder="Address"
                  value={form.fromAddress}
                  onChange={(e) => setField('fromAddress', e.target.value)}
                />
              </div>
              <ClientAutocomplete
                clients={clients}
                name={form.clientName}
                email={form.clientEmail}
                address={form.clientAddress}
                onNameChange={(v) => setField('clientName', v)}
                onEmailChange={(v) => setField('clientEmail', v)}
                onAddressChange={(v) => setField('clientAddress', v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Line items</Label>
              <datalist id="line-item-suggestions">
                {lineSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    list="line-item-suggestions"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    step="0.01"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    step="0.01"
                    placeholder="Unit price"
                    value={it.unit_price}
                    onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                  />
                  <Button
                    className="col-span-1"
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={form.items.length <= 1}
                    onClick={() => setForm((f) => ({
                      ...f,
                      items: f.items.length > 1 ? f.items.filter((_, j) => j !== i) : f.items,
                    }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
              >
                <Plus className="h-3.5 w-3.5" />Add line
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tax rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) => setField('taxRate', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1 text-sm self-end">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Terms</Label>
              <Textarea rows={2} value={form.terms} onChange={(e) => setField('terms', e.target.value)} />
            </div>

            {!validation.valid && (
              <ul className="text-sm text-destructive list-disc pl-5 space-y-0.5">
                {validation.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setTemplateNameOpen(true)}>
              Save as template
            </Button>
            <Button type="button" variant="ghost" onClick={tryCloseDialog}>Cancel</Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!validation.valid || saveMut.isPending}
            >
              {editingId ? 'Save changes' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits haven&apos;t been saved. {editingId ? 'Closing will lose them.' : 'Your local draft will be kept unless you clear it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateNameOpen} onOpenChange={setTemplateNameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>Reuse line items, tax, terms, and notes for future invoices.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Template name</Label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. Monthly retainer"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTemplateNameOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveTemplateMut.mutate()}
              disabled={!newTemplateName.trim() || saveTemplateMut.isPending}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
