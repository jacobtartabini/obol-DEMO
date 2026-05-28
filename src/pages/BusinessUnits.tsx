import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Archive } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  listBusinessUnits, createBusinessUnit, updateBusinessUnit, deleteBusinessUnit,
} from '@/lib/api2';

const PRESET_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function BusinessUnits() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const { data: units = [], isLoading } = useQuery({ queryKey: ['business_units'], queryFn: listBusinessUnits });

  const createMut = useMutation({
    mutationFn: () => createBusinessUnit({ name, description: description || null, color }),
    onSuccess: () => {
      toast.success('Business unit created');
      qc.invalidateQueries({ queryKey: ['business_units'] });
      setOpen(false); setName(''); setDescription(''); setColor(PRESET_COLORS[0]);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const archiveMut = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => updateBusinessUnit(id, { archived }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business_units'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBusinessUnit(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['business_units'] }); },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Business Units"
        description="Group transactions, invoices, and reports by project or business."
        actions={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New unit</Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : units.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No business units yet. Create one to start tagging transactions and invoices.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((u) => (
            <Card key={u.id} className={u.archived ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md shrink-0" style={{ backgroundColor: u.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{u.name}</h3>
                      {u.archived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
                    </div>
                    {u.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => archiveMut.mutate({ id: u.id, archived: !u.archived })}>
                    <Archive className="h-3.5 w-3.5" />{u.archived ? 'Unarchive' : 'Archive'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this business unit?')) deleteMut.mutate(u.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New business unit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme LLC" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-md border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
