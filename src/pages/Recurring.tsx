import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useUserKey } from '@/providers/AuthProvider';
import { createRecurring, deleteRecurring, listAccounts, listCategories, listCoa, listRecurring } from '@/lib/api';
import { coaDisplayLabel, coaForTransactionType } from '@/lib/coa';
import { refreshPlaidRecurring } from '@/lib/plaid';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import type { RecurringCadence, TxnType } from '@/types/db';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface FormState {
  description: string;
  amount: string;
  type: TxnType;
  account_id: string;
  category_id: string;
  coa_id: string;
  cadence: RecurringCadence;
  next_run: string;
  end_date: string;
}
const empty = (): FormState => ({
  description: '',
  amount: '',
  type: 'expense',
  account_id: '',
  category_id: '',
  coa_id: '',
  cadence: 'monthly',
  next_run: formatDateInput(new Date()),
  end_date: '',
});

export default function Recurring() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty());

  const { data: items = [] } = useQuery({
    queryKey: ['recurring', userKey],
    queryFn: () => listRecurring(userKey!),
    enabled: !!userKey,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', userKey],
    queryFn: () => listAccounts(userKey!),
    enabled: !!userKey,
  });
  const { data: cats = [] } = useQuery({
    queryKey: ['categories', userKey],
    queryFn: () => listCategories(userKey!),
    enabled: !!userKey,
  });
  const { data: coa = [] } = useQuery({
    queryKey: ['coa', userKey],
    queryFn: () => listCoa(userKey!),
    enabled: !!userKey,
  });
  const coaOptions = useMemo(() => coaForTransactionType(form.type, coa), [coa, form.type]);

  const create = useMutation({
    mutationFn: async () => {
      if (!userKey) throw new Error('Not signed in');
      const amount = Number(form.amount);
      return createRecurring(userKey, {
        description: form.description,
        amount: form.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        type: form.type,
        account_id: form.account_id || null,
        category_id: form.category_id || null,
        coa_id: form.coa_id || null,
        cadence: form.cadence,
        next_run: form.next_run,
        end_date: form.end_date || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      setOpen(false);
      setForm(empty());
      toast.success('Recurring rule created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRecurring(userKey!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Deleted');
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await refreshPlaidRecurring();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      toast.success('Refreshed from connected banks');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkedCount = items.filter((r) => (r.notes ?? '').startsWith('Plaid:')).length;
  const isLinked = (r: { notes: string | null }) => (r.notes ?? '').startsWith('Plaid:');

  return (
    <PageContainer>
      <PageHeader
        title="Recurring"
        description={`Subscriptions and recurring payments — ${linkedCount} auto-detected from connected banks.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw className={`h-4 w-4 ${refresh.isPending ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New rule
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id} className="group">
                  <TableCell>
                    <div className="text-sm font-medium">{r.description}</div>
                    {!r.active && <Badge variant="outline" className="text-[10px] mt-1">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    {isLinked(r) ? (
                      <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">{r.cadence}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.next_run)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {formatCurrency(Math.abs(Number(r.amount)))}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isLinked(r) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => confirm('Delete recurring rule?') && remove.mutate(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    No recurring rules. Connect a bank to auto-detect subscriptions, or click "New rule".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New recurring rule</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TxnType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cadence</Label>
                <Select value={form.cadence} onValueChange={(v) => setForm((f) => ({ ...f, cadence: v as RecurringCadence }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next run</Label>
                <Input type="date" value={form.next_run} onChange={(e) => setForm((f) => ({ ...f, next_run: e.target.value }))} />
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
            <div className="space-y-1.5">
              <Label>Chart of Accounts</Label>
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
            <div className="space-y-1.5">
              <Label>Tag (optional)</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
