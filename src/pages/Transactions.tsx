import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserKey } from '@/providers/AuthProvider';
import {
  createTransaction,
  createTransfer,
  deleteTransaction,
  listAccounts,
  listCategories,
  listCoa,
  listTransactions,
  updateTransaction,
} from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Trash2, Pencil, ArrowLeftRight, CalendarRange } from 'lucide-react';
import { coaDisplayLabel, coaForTransactionType, coaLabelById } from '@/lib/coa';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import type { Transaction, TxnType } from '@/types/db';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SwipeRow } from '@/components/mobile/SwipeRow';

interface FormState {
  txn_date: string;
  description: string;
  merchant: string;
  amount: string;
  type: TxnType;
  account_id: string;
  category_id: string;
  coa_id: string;
  tax_deductible: boolean;
  notes: string;
}

const emptyForm = (): FormState => ({
  txn_date: formatDateInput(new Date()),
  description: '',
  merchant: '',
  amount: '',
  type: 'expense',
  account_id: '',
  category_id: '',
  coa_id: '',
  tax_deductible: false,
  notes: '',
});

interface TransferForm {
  txn_date: string;
  from_account_id: string;
  to_account_id: string;
  amount: string;
  description: string;
}

function ymdToEpochDay(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const ms = Date.UTC(y, mo - 1, d);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86400000);
}

function epochDayToYmd(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

export default function Transactions() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferForm>({
    txn_date: formatDateInput(new Date()),
    from_account_id: '',
    to_account_id: '',
    amount: '',
    description: '',
  });
  const [filter, setFilter] = useState({
    type: 'all',
    accountId: 'all',
    q: '',
    from: '',
    to: '',
  });
  const [rangeDays, setRangeDays] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (search.get('new') === '1') {
      setEditing(null);
      setForm(emptyForm());
      setSheetOpen(true);
      search.delete('new');
      setSearch(search, { replace: true });
    }
    const q = search.get('q');
    if (q) {
      setFilter((f) => ({ ...f, q }));
      search.delete('q');
      setSearch(search, { replace: true });
    }
  }, [search, setSearch]);

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ['txns', userKey],
    queryFn: () => listTransactions(userKey!),
    enabled: !!userKey,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', userKey],
    queryFn: () => listAccounts(userKey!),
    enabled: !!userKey,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userKey],
    queryFn: () => listCategories(userKey!),
    enabled: !!userKey,
  });
  const { data: coa = [] } = useQuery({
    queryKey: ['coa', userKey],
    queryFn: () => listCoa(userKey!),
    enabled: !!userKey,
  });

  const txnBounds = useMemo(() => {
    if (txns.length === 0) {
      const today = formatDateInput(new Date());
      const day = ymdToEpochDay(today) ?? Math.floor(Date.now() / 86400000);
      return { minYmd: today, maxYmd: today, minDay: day, maxDay: day };
    }
    let minYmd = txns[0].txn_date;
    let maxYmd = txns[0].txn_date;
    for (const t of txns) {
      if (t.txn_date < minYmd) minYmd = t.txn_date;
      if (t.txn_date > maxYmd) maxYmd = t.txn_date;
    }
    const minDay = ymdToEpochDay(minYmd) ?? 0;
    const maxDay = ymdToEpochDay(maxYmd) ?? minDay;
    return { minYmd, maxYmd, minDay, maxDay };
  }, [txns]);

  useEffect(() => {
    if (rangeDays) return;
    if (isLoading) return;
    setRangeDays([txnBounds.minDay, txnBounds.maxDay]);
    setFilter((f) => ({
      ...f,
      from: f.from || txnBounds.minYmd,
      to: f.to || txnBounds.maxYmd,
    }));
  }, [isLoading, rangeDays, txnBounds.maxDay, txnBounds.maxYmd, txnBounds.minDay, txnBounds.minYmd]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filter.from && t.txn_date < filter.from) return false;
      if (filter.to && t.txn_date > filter.to) return false;
      if (filter.type !== 'all' && t.type !== filter.type) return false;
      if (filter.accountId !== 'all' && t.account_id !== filter.accountId) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        if (
          !t.description.toLowerCase().includes(q) &&
          !(t.merchant ?? '').toLowerCase().includes(q) &&
          !(t.notes ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [txns, filter]);

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let transfers = 0;
    for (const t of filtered) {
      const amt = Number(t.amount);
      if (!Number.isFinite(amt)) continue;
      if (t.type === 'income') income += Math.abs(amt);
      else if (t.type === 'expense') expenses += Math.abs(amt);
      else if (t.type === 'transfer') transfers += Math.abs(amt);
    }
    return { income, expenses, transfers, count: filtered.length };
  }, [filtered]);

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—';
  const coaOptions = useMemo(
    () => coaForTransactionType(form.type, coa),
    [coa, form.type],
  );
  const coaLabel = (id: string | null) => coaLabelById(coa, id);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!userKey) throw new Error('Not signed in');
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount === 0) throw new Error('Amount required');
      const signed = form.type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
      const payload = {
        txn_date: form.txn_date,
        description: form.description,
        merchant: form.merchant || null,
        amount: signed,
        type: form.type,
        account_id: form.account_id || null,
        category_id: form.category_id || null,
        coa_id: form.coa_id || null,
        tax_deductible: form.tax_deductible,
        notes: form.notes || null,
      };
      if (editing) return updateTransaction(userKey, editing.id, payload);
      return createTransaction(userKey, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['txns'] });
      qc.invalidateQueries({ queryKey: ['dash-txns'] });
      qc.invalidateQueries({ queryKey: ['dash-recent'] });
      setSheetOpen(false);
      toast.success(editing ? 'Transaction updated' : 'Transaction created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction(userKey!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['txns'] });
      toast.success('Transaction deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: async () => {
      if (!userKey) throw new Error('Not signed in');
      const amount = Number(transferForm.amount);
      if (!Number.isFinite(amount) || amount === 0) throw new Error('Amount required');
      if (!transferForm.from_account_id || !transferForm.to_account_id) throw new Error('Both accounts required');
      if (transferForm.from_account_id === transferForm.to_account_id) throw new Error('Choose different accounts');
      return createTransfer(userKey, {
        txn_date: transferForm.txn_date,
        from_account_id: transferForm.from_account_id,
        to_account_id: transferForm.to_account_id,
        amount,
        description: transferForm.description || 'Transfer',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['txns'] });
      setTransferOpen(false);
      toast.success('Transfer recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      txn_date: t.txn_date,
      description: t.description,
      merchant: t.merchant ?? '',
      amount: String(Math.abs(Number(t.amount))),
      type: t.type,
      account_id: t.account_id ?? '',
      category_id: t.category_id ?? '',
      coa_id: t.coa_id ?? '',
      tax_deductible: t.tax_deductible,
      notes: t.notes ?? '',
    });
    setSheetOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        description="Every income, expense, and transfer that flows through your books."
        actions={
          <>
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" /> Transfer
            </Button>
            <Button onClick={openNew} data-tour="transactions-new">
              <Plus className="h-4 w-4" /> New
            </Button>
          </>
        }
      />

      {/* Summary */}
      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Income
                </div>
                <div className="text-sm font-semibold tabular-nums money-positive">
                  {formatCurrency(summary.income)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Expenses
                </div>
                <div className="text-sm font-semibold tabular-nums money-negative">
                  {formatCurrency(summary.expenses)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Transfers
                </div>
                <div className="text-sm font-semibold tabular-nums money-neutral">
                  {formatCurrency(summary.transfers)}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground tabular-nums sm:text-right">
              {summary.count} transaction{summary.count === 1 ? '' : 's'}
              {filter.from && filter.to ? ` · ${formatDate(filter.from)} → ${formatDate(filter.to)}` : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, merchant, notes…"
              className="pl-9"
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <Select value={filter.type} onValueChange={(v) => setFilter((f) => ({ ...f, type: v }))}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.accountId} onValueChange={(v) => setFilter((f) => ({ ...f, accountId: v }))}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto justify-start gap-2 tabular-nums"
              >
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">
                  {filter.from && filter.to ? `${formatDate(filter.from)} → ${formatDate(filter.to)}` : 'Date range'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[92vw] sm:w-[520px] p-0 overflow-hidden">
              <Card className="border-0 shadow-none rounded-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Date range</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFilter((f) => ({ ...f, from: txnBounds.minYmd, to: txnBounds.maxYmd }));
                          setRangeDays([txnBounds.minDay, txnBounds.maxDay]);
                        }}
                      >
                        All time
                      </Button>
                      <Button type="button" size="sm" onClick={() => setDatePopoverOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">From</Label>
                        <Input
                          type="date"
                          value={filter.from}
                          min={txnBounds.minYmd}
                          max={filter.to || txnBounds.maxYmd}
                          onChange={(e) => {
                            const nextFrom = e.target.value;
                            const nextTo = filter.to && filter.to < nextFrom ? nextFrom : filter.to;
                            setFilter((f) => ({ ...f, from: nextFrom, to: nextTo }));
                            const a = ymdToEpochDay(nextFrom);
                            const b = ymdToEpochDay(nextTo || nextFrom);
                            if (a !== null && b !== null) setRangeDays([a, b]);
                          }}
                          className="w-full sm:w-[200px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">To</Label>
                        <Input
                          type="date"
                          value={filter.to}
                          min={filter.from || txnBounds.minYmd}
                          max={txnBounds.maxYmd}
                          onChange={(e) => {
                            const nextTo = e.target.value;
                            const nextFrom = filter.from && filter.from > nextTo ? nextTo : filter.from;
                            setFilter((f) => ({ ...f, from: nextFrom, to: nextTo }));
                            const a = ymdToEpochDay(nextFrom || nextTo);
                            const b = ymdToEpochDay(nextTo);
                            if (a !== null && b !== null) setRangeDays([a, b]);
                          }}
                          className="w-full sm:w-[200px]"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground sm:ml-auto tabular-nums">
                        {filter.from && filter.to
                          ? `${formatDate(filter.from)} → ${formatDate(filter.to)}`
                          : 'Pick a date range'}
                      </div>
                    </div>

                    <div className="pt-1">
                      <Slider
                        min={txnBounds.minDay}
                        max={txnBounds.maxDay}
                        step={1}
                        value={rangeDays ?? [txnBounds.minDay, txnBounds.maxDay]}
                        onValueChange={(v) => {
                          if (!Array.isArray(v) || v.length < 2) return;
                          const a = Math.min(v[0]!, v[1]!);
                          const b = Math.max(v[0]!, v[1]!);
                          setRangeDays([a, b]);
                          const from = epochDayToYmd(a);
                          const to = epochDayToYmd(b);
                          setFilter((f) => ({ ...f, from, to }));
                        }}
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-1 tabular-nums">
                        <span>{formatDate(txnBounds.minYmd)}</span>
                        <span>{formatDate(txnBounds.maxYmd)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Chart of Accounts</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No transactions match.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t.id} className="group">
                  <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(t.txn_date)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{t.description}</div>
                    {t.merchant && <div className="text-xs text-muted-foreground">{t.merchant}</div>}
                    {t.tax_deductible && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        Tax-deductible
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{accountName(t.account_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{coaLabel(t.coa_id)}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right text-sm font-semibold tabular-nums',
                      t.type === 'income' ? 'money-positive' : t.type === 'expense' ? 'money-negative' : 'money-neutral',
                    )}
                  >
                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                    {formatCurrency(Math.abs(Number(t.amount)))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this transaction?')) remove.mutate(t.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile card list with swipe actions */}
      <div className="md:hidden space-y-2">
        {isLoading && (
          <div className="text-center text-muted-foreground py-8 text-sm">Loading…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No transactions match.
          </div>
        )}
        {filtered.map((t) => (
          <SwipeRow
            key={t.id}
            onTap={() => openEdit(t)}
            className="rounded-xl border border-border bg-card shadow-sm"
            rightActions={
              <>
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 bg-secondary text-secondary-foreground flex flex-col items-center justify-center gap-0.5 text-xs font-medium"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this transaction?')) remove.mutate(t.id);
                  }}
                  className="flex-1 bg-destructive text-destructive-foreground flex flex-col items-center justify-center gap-0.5 text-xs font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            }
          >
            <div className="flex items-center gap-3 p-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-base font-semibold shrink-0',
                  t.type === 'income'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : t.type === 'expense'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {(t.merchant || t.description || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-medium text-sm truncate">{t.description}</div>
                  <div
                    className={cn(
                      'text-sm font-semibold tabular-nums shrink-0',
                      t.type === 'income'
                        ? 'money-positive'
                        : t.type === 'expense'
                        ? 'money-negative'
                        : 'money-neutral',
                    )}
                  >
                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                    {formatCurrency(Math.abs(Number(t.amount)))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="text-xs text-muted-foreground truncate">
                    {accountName(t.account_id)} · {coaLabel(t.coa_id)}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {formatDate(t.txn_date)}
                  </div>
                </div>
                {t.tax_deductible && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    Tax-deductible
                  </Badge>
                )}
              </div>
            </div>
          </SwipeRow>
        ))}
        <p className="text-[11px] text-center text-muted-foreground pt-2">
          Swipe a row left to edit or delete.
        </p>
      </div>

      {/* Transaction Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit transaction' : 'New transaction'}</SheetTitle>
            <SheetDescription>Record income or an expense.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.txn_date}
                  onChange={(e) => setForm((f) => ({ ...f, txn_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TxnType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Merchant</Label>
                <Input value={form.merchant} onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={form.account_id} onValueChange={(v) => setForm((f) => ({ ...f, account_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tag (optional)</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Chart of Accounts</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Includes all manual and system accounts.
                </p>
                <Select value={form.coa_id} onValueChange={(v) => setForm((f) => ({ ...f, coa_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {coaDisplayLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="text-sm">Tax deductible</Label>
                <p className="text-xs text-muted-foreground">Include in tax reports.</p>
              </div>
              <Switch
                checked={form.tax_deductible}
                onCheckedChange={(v) => setForm((f) => ({ ...f, tax_deductible: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Transfer Sheet */}
      <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Transfer between accounts</SheetTitle>
            <SheetDescription>Creates a paired outflow and inflow.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={transferForm.txn_date}
                onChange={(e) => setTransferForm((f) => ({ ...f, txn_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>From account</Label>
              <Select
                value={transferForm.from_account_id}
                onValueChange={(v) => setTransferForm((f) => ({ ...f, from_account_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To account</Label>
              <Select
                value={transferForm.to_account_id}
                onValueChange={(v) => setTransferForm((f) => ({ ...f, to_account_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Transfer"
                value={transferForm.description}
                onChange={(e) => setTransferForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => transfer.mutate()} disabled={transfer.isPending}>
              Record transfer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
