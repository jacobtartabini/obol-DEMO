import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useUserKey } from '@/providers/AuthProvider';
import { createCategory, deleteCategory, listCategories } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b'];

export default function Categories() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#6366f1', tax_deductible: false });

  const { data: cats = [] } = useQuery({
    queryKey: ['categories', userKey],
    queryFn: () => listCategories(userKey!),
    enabled: !!userKey,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!userKey) throw new Error('Not signed in');
      return createCategory(userKey, {
        name: form.name,
        color: form.color,
        tax_deductible: form.tax_deductible,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setOpen(false);
      setForm({ name: '', color: '#6366f1', tax_deductible: false });
      toast.success('Category created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(userKey!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Deleted');
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Categories"
        description="Optional colored tags for filtering. To classify spending for reports and taxes, use Chart of Accounts on each transaction."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 group">
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                <span className="text-sm font-medium flex-1">{c.name}</span>
                {c.tax_deductible && <Badge variant="secondary" className="text-[10px]">Tax-deductible</Badge>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => confirm('Delete category?') && remove.mutate(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
            {cats.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">No categories yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New category</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label>Tax deductible</Label>
              <Switch
                checked={form.tax_deductible}
                onCheckedChange={(v) => setForm((f) => ({ ...f, tax_deductible: v }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
