import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAiKey, getAiStatus, saveAiSettings } from '@/lib/ai';
import { getInvoiceSettings, saveInvoiceSettings, type SavedLineItem } from '@/lib/api2';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Sun, Moon, Monitor, Sparkles, Shield, FileText, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { replayDemoTour } from '@/demo/DemoTour';

export default function Settings() {
  const { userKey, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: getAiStatus,
  });

  const [apiKey, setApiKey] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [shareMerchants, setShareMerchants] = useState(false);
  const [shareNotes, setShareNotes] = useState(false);

  const { data: invoiceSettings } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: getInvoiceSettings,
  });

  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [defaultTerms, setDefaultTerms] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [defaultDueDays, setDefaultDueDays] = useState('');
  const [savedLineItems, setSavedLineItems] = useState<SavedLineItem[]>([]);

  // Note: the static demo strips all external integrations (Arlo, Supabase, Plaid, etc.)

  useEffect(() => {
    if (!invoiceSettings) return;
    setFromName(invoiceSettings.from_name ?? '');
    setFromEmail(invoiceSettings.from_email ?? '');
    setFromAddress(invoiceSettings.from_address ?? '');
    setDefaultTaxRate(Number(invoiceSettings.default_tax_rate) || 0);
    setDefaultTerms(invoiceSettings.default_terms ?? '');
    setDefaultNotes(invoiceSettings.default_notes ?? '');
    setInvoicePrefix(invoiceSettings.invoice_prefix || 'INV-');
    setDefaultDueDays(
      invoiceSettings.default_due_days != null ? String(invoiceSettings.default_due_days) : '',
    );
    setSavedLineItems(invoiceSettings.saved_line_items ?? []);
  }, [invoiceSettings]);

  useEffect(() => {
    if (!aiStatus) return;
    setAiEnabled(aiStatus.ai_enabled);
    setShareMerchants(aiStatus.share_merchant_names);
    setShareNotes(aiStatus.share_transaction_notes);
  }, [aiStatus]);

  const saveAi = useMutation({
    mutationFn: () =>
      saveAiSettings({
        api_key: apiKey.trim() || undefined,
        ai_enabled: aiEnabled,
        share_merchant_names: shareMerchants,
        share_transaction_notes: shareNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-status'] });
      setApiKey('');
      toast.success('AI settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeKey = useMutation({
    mutationFn: clearAiKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-status'] });
      setApiKey('');
      setAiEnabled(false);
      toast.success('API key removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveInvoiceDefaults = useMutation({
    mutationFn: () =>
      saveInvoiceSettings({
        from_name: fromName.trim() || null,
        from_email: fromEmail.trim() || null,
        from_address: fromAddress.trim() || null,
        default_tax_rate: defaultTaxRate,
        default_terms: defaultTerms.trim() || null,
        default_notes: defaultNotes.trim() || null,
        invoice_prefix: invoicePrefix.trim() || 'INV-',
        default_due_days: defaultDueDays.trim() ? Number(defaultDueDays) : null,
        saved_line_items: savedLineItems.filter((it) => it.description.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-settings'] });
      toast.success('Invoice defaults saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Workspace preferences and account." />

      <div className="space-y-4 max-w-2xl">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI insights (Anthropic)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your API key is encrypted and stored server-side. It is only used to call Anthropic when you
              request insights on the{' '}
              <Link to="/insights" className="text-primary underline-offset-2 hover:underline">
                AI Insights
              </Link>{' '}
              page.
            </p>

            <div className="rounded-lg border border-border p-3 flex gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">Privacy defaults (recommended)</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Only aggregated totals by chart-of-accounts label are sent</li>
                  <li>No bank account numbers, institution names, or user identity</li>
                  <li>No full transaction descriptions unless you opt in below</li>
                </ul>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="anthropic-key">
                Anthropic API key {aiStatus?.configured ? '(saved — leave blank to keep)' : ''}
              </Label>
              <Input
                id="anthropic-key"
                type="password"
                autoComplete="off"
                placeholder="sk-ant-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label>Enable AI insights</Label>
                <p className="text-xs text-muted-foreground">Allow generating analysis from the Insights page.</p>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label>Share masked merchant labels</Label>
                <p className="text-xs text-muted-foreground">
                  Sends first 4 characters only (e.g. AMZN…) for top merchants. Off by default.
                </p>
              </div>
              <Switch checked={shareMerchants} onCheckedChange={setShareMerchants} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3 opacity-60">
              <div>
                <Label>Share transaction notes</Label>
                <p className="text-xs text-muted-foreground">Not yet used. Kept off for safety.</p>
              </div>
              <Switch checked={shareNotes} onCheckedChange={setShareNotes} disabled />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveAi.mutate()} disabled={saveAi.isPending}>
                Save AI settings
              </Button>
              {aiStatus?.configured && (
                <Button variant="outline" onClick={() => removeKey.mutate()} disabled={removeKey.isPending}>
                  Remove API key
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoice defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prefill new invoices with your company details, tax, terms, and common line items.
              Invoice numbers are assigned automatically when you create an invoice.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Company / from name</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your LLC" />
              </div>
              <div className="space-y-1.5">
                <Label>From email</Label>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="billing@…" />
              </div>
              <div className="space-y-1.5">
                <Label>Default tax rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>From address</Label>
                <Textarea rows={2} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice number prefix</Label>
                <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="INV-" />
              </div>
              <div className="space-y-1.5">
                <Label>Default due (days after issue)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 30 for Net 30"
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Default terms</Label>
                <Textarea rows={2} value={defaultTerms} onChange={(e) => setDefaultTerms(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Default notes</Label>
                <Textarea rows={2} value={defaultNotes} onChange={(e) => setDefaultNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Saved line item suggestions</Label>
              <p className="text-xs text-muted-foreground">
                Appear as autocomplete when adding line items on invoices.
              </p>
              {savedLineItems.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => setSavedLineItems(savedLineItems.map((x, j) =>
                      j === i ? { ...x, description: e.target.value } : x,
                    ))}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => setSavedLineItems(savedLineItems.map((x, j) =>
                      j === i ? { ...x, quantity: Number(e.target.value) } : x,
                    ))}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Price"
                    value={it.unit_price}
                    onChange={(e) => setSavedLineItems(savedLineItems.map((x, j) =>
                      j === i ? { ...x, unit_price: Number(e.target.value) } : x,
                    ))}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="col-span-1"
                    onClick={() => setSavedLineItems(savedLineItems.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSavedLineItems([...savedLineItems, { description: '', quantity: 1, unit_price: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" />Add suggestion
              </Button>
            </div>

            <Button onClick={() => saveInvoiceDefaults.mutate()} disabled={saveInvoiceDefaults.isPending}>
              Save invoice defaults
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Identity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground">Demo user</div>
            <div className="font-mono text-sm bg-muted px-3 py-2 rounded-md break-all">{userKey ?? '—'}</div>
            <Button variant="outline" onClick={() => {
              if (!confirm('Reset demo data? This will clear local changes and reload the app.')) return;
              logout();
            }}>Reset demo data</Button>
            <Button variant="ghost" onClick={() => replayDemoTour()}>Replay tour</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => {
                const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                      theme === t ? 'border-primary bg-primary-muted' : 'border-border hover:bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs capitalize">{t}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">About</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Obol Accounting v1.0 — private accounting for single-member LLCs.</p>
            <p>Authentication: demo (always logged in). Data: in-browser, persisted to localStorage.</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
