import { useRef, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Link2, Download, Receipt as ReceiptIcon, Camera } from 'lucide-react';
import { useUserKey } from '@/providers/AuthProvider';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { listReceipts, createReceipt, updateReceipt, deleteReceipt, type Receipt } from '@/lib/api2';
import { listTransactions } from '@/lib/api';
import { uploadFile, getDownloadUrl, deleteFile } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/format';

export default function Receipts() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link from PWA shortcut or mobile Scan tab → open camera immediately.
  useEffect(() => {
    if (searchParams.get('action') === 'scan') {
      // Defer to next tick so the input is mounted.
      const t = setTimeout(() => cameraRef.current?.click(), 50);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  const { data: receipts = [], isLoading } = useQuery({ queryKey: ['receipts'], queryFn: listReceipts });
  const { data: txns = [] } = useQuery({
    queryKey: ['txns-for-receipts', userKey],
    queryFn: () => listTransactions(userKey!, { limit: 500 }),
    enabled: !!userKey,
  });

  const txnById = useMemo(() => new Map(txns.map((t) => [t.id, t])), [txns]);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const { path } = await uploadFile('receipts', file);
      return createReceipt({
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        ocr_status: 'pending',
      });
    },
    onSuccess: () => {
      toast.success('Receipt uploaded. OCR will run when Claude key is configured.');
      qc.invalidateQueries({ queryKey: ['receipts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (r: Receipt) => {
      await deleteFile('receipts', r.storage_path).catch(() => {});
      await deleteReceipt(r.id);
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['receipts'] }); },
  });

  const attachMut = useMutation({
    mutationFn: ({ id, transaction_id }: { id: string; transaction_id: string | null }) =>
      updateReceipt(id, { transaction_id, ocr_status: 'manual' }),
    onSuccess: () => {
      toast.success('Attached');
      qc.invalidateQueries({ queryKey: ['receipts'] });
      setAttachOpen(false); setActiveReceipt(null); setSelectedTxnId('');
    },
  });

  async function openFile(r: Receipt) {
    try {
      const url = await getDownloadUrl('receipts', r.storage_path);
      window.open(url, '_blank', 'noopener');
    } catch (e) { toast.error((e as Error).message); }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => uploadMut.mutate(f));
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <PageContainer>
      <PageHeader
        title="Receipts"
        description="Capture or upload receipts and attach them to transactions."
        actions={
          <>
            <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={onPickFile} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickFile} />
            <Button onClick={() => cameraRef.current?.click()} className="md:hidden">
              <Camera className="h-4 w-4" />Scan
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="md:hidden">
              <Upload className="h-4 w-4" />
            </Button>
            <Button onClick={() => fileRef.current?.click()} className="hidden md:inline-flex">
              <Upload className="h-4 w-4" />Upload
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : receipts.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <ReceiptIcon className="h-8 w-8 mx-auto mb-3 opacity-50" />
              No receipts yet. Tap <span className="font-medium text-foreground">Scan</span> to capture one with your camera, or upload an image/PDF.
              <div className="mt-4 flex justify-center gap-2 md:hidden">
                <Button onClick={() => cameraRef.current?.click()}><Camera className="h-4 w-4" />Scan receipt</Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Attached to</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((r) => {
                  const t = r.transaction_id ? txnById.get(r.transaction_id) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[280px] truncate">{r.file_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={r.ocr_status === 'processed' ? 'default' : r.ocr_status === 'failed' ? 'destructive' : 'secondary'}>
                          {r.ocr_status}
                        </Badge>
                        {r.ocr_amount != null && <span className="ml-2 text-xs text-muted-foreground">{formatCurrency(r.ocr_amount)}</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t ? `${formatDate(t.txn_date)} · ${t.description} · ${formatCurrency(Math.abs(Number(t.amount)))}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openFile(r)}><Download className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setActiveReceipt(r); setSelectedTxnId(r.transaction_id ?? ''); setAttachOpen(true); }}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this receipt?')) deleteMut.mutate(r); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach receipt to transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{activeReceipt?.file_name}</div>
            <Select value={selectedTxnId} onValueChange={setSelectedTxnId}>
              <SelectTrigger><SelectValue placeholder="Pick a transaction…" /></SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {txns.slice(0, 200).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {formatDate(t.txn_date)} · {t.description} · {formatCurrency(Math.abs(Number(t.amount)))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => activeReceipt && attachMut.mutate({ id: activeReceipt.id, transaction_id: null })}>Detach</Button>
            <Button onClick={() => activeReceipt && selectedTxnId && attachMut.mutate({ id: activeReceipt.id, transaction_id: selectedTxnId })} disabled={!selectedTxnId}>Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
