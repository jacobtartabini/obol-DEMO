import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useUserKey } from '@/providers/AuthProvider';
import { createCoa, deleteCoa, listCoa, updateCoa } from '@/lib/api';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatPlaidKeywords, parsePlaidKeywordsInput } from '@/lib/coa';
import type { Coa, CoaType } from '@/types/db';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FormState {
  code: string;
  name: string;
  type: CoaType;
  description: string;
  plaid_keywords: string;
  is_active: boolean;
}
const empty = (): FormState => ({
  code: '',
  name: '',
  type: 'expense',
  description: '',
  plaid_keywords: '',
  is_active: true,
});

export default function ChartOfAccounts() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coa | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [tab, setTab] = useState<CoaType | 'all'>('all');

  const { data: coa = [] } = useQuery({
    queryKey: ['coa', userKey],
    queryFn: () => listCoa(userKey!),
    enabled: !!userKey,
  });

  const filtered = useMemo(() => (tab === 'all' ? coa : coa.filter((c) => c.type === tab)), [coa, tab]);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!userKey) throw new Error('Not signed in');
      const payload = {
        code: form.code,
        name: form.name,
        type: form.type,
        description: form.description || null,
        plaid_keywords: parsePlaidKeywordsInput(form.plaid_keywords),
        is_active: form.is_active,
      };
      if (editing) return updateCoa(userKey, editing.id, payload);
      return createCoa(userKey, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa'] });
      setOpen(false);
      toast.success(editing ? 'Account updated' : 'Account added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCoa(userKey!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa'] });
      toast.success('Removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (c: Coa) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      type: c.type,
      description: c.description ?? '',
      plaid_keywords: formatPlaidKeywords(c.plaid_keywords),
      is_active: c.is_active,
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
        title="Chart of Accounts"
        description="Every account here can be assigned to transactions—including ones you add manually. Use auto-label keywords to route bank imports."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as never)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="asset">Assets</TabsTrigger>
          <TabsTrigger value="liability">Liabilities</TabsTrigger>
          <TabsTrigger value="equity">Equity</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {filtered.map((c) => (
                  <li key={c.id} className="flex items-center gap-4 px-4 py-3 group hover:bg-muted/40 transition-colors">
                    <div className="font-mono text-xs text-muted-foreground w-14">{c.code}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground truncate">{c.description}</div>}
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px]">{c.type}</Badge>
                    {c.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
                    {!c.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!c.is_system && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => confirm('Remove this account?') && remove.mutate(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="p-8 text-center text-sm text-muted-foreground">No accounts in this group.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit COA entry' : 'New COA entry'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as CoaType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Auto-label keywords</Label>
              <Input
                value={form.plaid_keywords}
                onChange={(e) => setForm((f) => ({ ...f, plaid_keywords: e.target.value }))}
                placeholder="pet, vet, chewy (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                When Plaid syncs transactions, keywords are matched against categories and descriptions to route
                spending into this account.
              </p>
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
