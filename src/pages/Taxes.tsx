import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Upload, Download, Trash2, FileText } from 'lucide-react';
import { useUserKey } from '@/providers/AuthProvider';
import { listTransactions, listCoa } from '@/lib/api';
import { listTaxDocuments, createTaxDocument, deleteTaxDocument, type TaxDocument } from '@/lib/api2';
import { uploadFile, getDownloadUrl, deleteFile } from '@/lib/storage';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDateInput, startOfYear, endOfYear, formatDate } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const DOC_TYPES: { value: TaxDocument['doc_type']; label: string }[] = [
  { value: 'w2', label: 'W-2' },
  { value: '1099', label: '1099' },
  { value: '1098', label: '1098' },
  { value: 'receipt_summary', label: 'Receipt Summary' },
  { value: 'return', label: 'Tax Return' },
  { value: 'other', label: 'Other' },
];

export default function Taxes() {
  const userKey = useUserKey();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [from, setFrom] = useState(formatDateInput(startOfYear()));
  const [to, setTo] = useState(formatDateInput(endOfYear()));
  const [docType, setDocType] = useState<TaxDocument['doc_type']>('w2');
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear() - 1);
  const [issuer, setIssuer] = useState('');

  const { data: txns = [] } = useQuery({
    queryKey: ['tax-txns', userKey, from, to],
    queryFn: () => listTransactions(userKey!, { from, to }),
    enabled: !!userKey,
  });
  const { data: coa = [] } = useQuery({ queryKey: ['coa', userKey], queryFn: () => listCoa(userKey!), enabled: !!userKey });
  const { data: docs = [] } = useQuery({ queryKey: ['tax_documents'], queryFn: listTaxDocuments });

  const deductibles = useMemo(() => txns.filter((t) => t.tax_deductible && t.type === 'expense'), [txns]);
  const totalDeductible = useMemo(() => deductibles.reduce((s, t) => s + Math.abs(Number(t.amount)), 0), [deductibles]);
  const totalIncome = useMemo(() => txns.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(Number(t.amount)), 0), [txns]);
  const totalExpenses = useMemo(() => txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount)), 0), [txns]);

  const byCoa = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of deductibles) {
      const c = coa.find((x) => x.id === t.coa_id);
      const k = c ? `${c.code} · ${c.name}` : 'Uncategorized';
      m.set(k, (m.get(k) ?? 0) + Math.abs(Number(t.amount)));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [deductibles, coa]);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const { path } = await uploadFile('tax-documents', file);
      return createTaxDocument({
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        doc_type: docType,
        tax_year: taxYear,
        issuer: issuer || null,
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['tax_documents'] });
      setIssuer('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (d: TaxDocument) => {
      await deleteFile('tax-documents', d.storage_path).catch(() => {});
      await deleteTaxDocument(d.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax_documents'] }),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadMut.mutate(f);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function openDoc(d: TaxDocument) {
    try {
      const url = await getDownloadUrl('tax-documents', d.storage_path);
      window.open(url, '_blank', 'noopener');
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <PageContainer>
      <PageHeader title="Taxes" description="Tax-deductible totals, documents, and year-end summary." />

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" /></div>
              <div className="space-y-1.5"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" /></div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total income</div><div className="text-2xl font-semibold tabular-nums money-positive">{formatCurrency(totalIncome)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total expenses</div><div className="text-2xl font-semibold tabular-nums money-negative">{formatCurrency(totalExpenses)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tax-deductible</div><div className="text-2xl font-semibold tabular-nums">{formatCurrency(totalDeductible)}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Deductions by account</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {byCoa.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm truncate">{k}</span>
                    <span className="text-sm tabular-nums font-medium">{formatCurrency(v)}</span>
                  </li>
                ))}
                {byCoa.length === 0 && <li className="p-6 text-sm text-muted-foreground text-center">Mark expenses as tax-deductible to see them here.</li>}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductibles.map((t) => {
                    const c = coa.find((x) => x.id === t.coa_id);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDate(t.txn_date)}</TableCell>
                        <TableCell className="text-sm">{t.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c ? `${c.code} · ${c.name}` : '—'}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums money-negative">{formatCurrency(Math.abs(Number(t.amount)))}</TableCell>
                      </TableRow>
                    );
                  })}
                  {deductibles.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">No deductibles in this period.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as TaxDocument['doc_type'])}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Tax year</Label><Input type="number" className="w-[110px]" value={taxYear} onChange={(e) => setTaxYear(Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Issuer</Label><Input className="w-[200px]" placeholder="Employer / institution" value={issuer} onChange={(e) => setIssuer(e.target.value)} /></div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPickFile} />
              <Button onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}><Upload className="h-4 w-4" />Upload</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {docs.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  No tax documents yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Issuer</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[300px] truncate">{d.file_name}</TableCell>
                        <TableCell><Badge variant="secondary">{DOC_TYPES.find((x) => x.value === d.doc_type)?.label ?? d.doc_type}</Badge></TableCell>
                        <TableCell className="tabular-nums">{d.tax_year ?? '—'}</TableCell>
                        <TableCell className="text-sm">{d.issuer ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openDoc(d)}><Download className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this document?')) deleteMut.mutate(d); }}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
