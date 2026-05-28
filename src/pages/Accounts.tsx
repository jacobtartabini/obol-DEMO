import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useUserKey } from '@/providers/AuthProvider';
import { createAccount, deleteAccount, listAccounts, updateAccount } from '@/lib/api';
import { listLinkedAccounts, syncPlaidTransactions, removePlaidItem } from '@/lib/plaid';
import { RefreshCw, Unlink } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PlaidConnectButton } from '@/components/plaid/PlaidConnectButton';
import { formatCurrency } from '@/lib/format';
import type { Account, AccountType } from '@/types/db';
import { toast } from 'sonner';

interface FormState {
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: string;
  institution: string;
  last4: string;
  archived: boolean;
}
const empty = (): FormState => ({
  name: '',
  type: 'checking',
  currency: 'USD',
  opening_balance: '0',
  institution: '',
  last4: '',
  archived: false,
});

export default function Accounts() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(empty());

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', userKey],
    queryFn: () => listAccounts(userKey!),
    enabled: !!userKey,
  });

  const { data: linkedAccounts = [], isLoading: loadingLinked } = useQuery({
    queryKey: ['plaid-accounts', userKey],
    queryFn: () => listLinkedAccounts(),
    enabled: !!userKey,
  });

  const sync = useMutation({
    mutationFn: (itemId?: string) => syncPlaidTransactions(itemId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['plaid-accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Synced ${r.total_synced} transaction${r.total_synced === 1 ? '' : 's'}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlink = useMutation({
    mutationFn: (itemId: string) => removePlaidItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plaid-accounts'] });
      toast.success('Bank disconnected');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!userKey) throw new Error('Not signed in');
      const payload = {
        name: form.name,
        type: form.type,
        currency: form.currency || 'USD',
        opening_balance: Number(form.opening_balance) || 0,
        institution: form.institution || null,
        last4: form.last4 || null,
        archived: form.archived,
      };
      if (editing) return updateAccount(userKey, editing.id, payload);
      return createAccount(userKey, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setOpen(false);
      toast.success(editing ? 'Account updated' : 'Account created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAccount(userKey!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type,
      currency: a.currency,
      opening_balance: String(a.opening_balance),
      institution: a.institution ?? '',
      last4: a.last4 ?? '',
      archived: a.archived,
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Accounts"
        description="Bank, credit, cash, and other financial accounts."
        actions={
          <div className="flex items-center gap-2">
            <PlaidConnectButton />
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> New account
            </Button>
          </div>
        }
      />

      {/* Linked accounts (Plaid) — split into banking vs investment */}
      {(loadingLinked || linkedAccounts.length > 0) && (() => {
        const bankingAccounts = linkedAccounts.filter(
          (a) => (a.account_type ?? '').toLowerCase() !== 'investment',
        );
        const investmentAccounts = linkedAccounts.filter(
          (a) => (a.account_type ?? '').toLowerCase() === 'investment',
        );

        const LinkedTable = ({
          title,
          items,
        }: {
          title: string;
          items: typeof linkedAccounts;
        }) => (
          <Card className="mb-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{title}</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Last sync</TableHead>
                    <TableHead className="w-[110px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLinked && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loadingLinked && items.map((a) => (
                    <TableRow key={a.id} className="group">
                      <TableCell>
                        <div className="font-medium text-sm">{a.institution_name}</div>
                        {a.error_message && (
                          <div className="text-xs text-destructive">{a.error_message}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.account_name ?? '—'}
                        {a.account_mask && <span className="ml-1">····{a.account_mask}</span>}
                        {a.account_subtype && (
                          <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                            {a.account_subtype}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {a.current_balance != null
                          ? formatCurrency(Number(a.current_balance), a.currency ?? 'USD')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Sync"
                            onClick={() => sync.mutate(a.plaid_item_id)}
                            disabled={sync.isPending}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Disconnect"
                            onClick={() =>
                              confirm('Disconnect this account? Transactions will remain.') &&
                              unlink.mutate(a.plaid_item_id)
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

        return (
          <>
            {(loadingLinked || bankingAccounts.length > 0) && (
              <LinkedTable title="Linked bank" items={bankingAccounts} />
            )}
            {(loadingLinked || investmentAccounts.length > 0) && (
              <LinkedTable title="Investment account" items={investmentAccounts} />
            )}
          </>
        );
      })()}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead className="text-right">Opening balance</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (() => {
                const linkedIds = new Set(linkedAccounts.map((l) => l.id));
                const manualOnly = accounts.filter((a) => !linkedIds.has(a.id));
                if (manualOnly.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No manual accounts. Use “Connect bank” above or add one manually.
                      </TableCell>
                    </TableRow>
                  );
                }
                return manualOnly.map((a) => (
                  <TableRow key={a.id} className="group">
                    <TableCell>
                      <div className="font-medium text-sm">{a.name}</div>
                      {a.last4 && <div className="text-xs text-muted-foreground">····{a.last4}</div>}
                      {a.archived && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{a.type.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.institution ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatCurrency(Number(a.opening_balance), a.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => confirm('Delete this account?') && remove.mutate(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit account' : 'New account'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AccountType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit_card">Credit card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Institution</Label>
              <Input value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Last 4</Label>
                <Input maxLength={4} value={form.last4} onChange={(e) => setForm((f) => ({ ...f, last4: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Opening balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
