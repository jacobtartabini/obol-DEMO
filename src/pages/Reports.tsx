import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserKey } from '@/providers/AuthProvider';
import { listAccounts, listCoa, listTransactions } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDateInput, startOfMonth, endOfMonth, startOfYear, endOfYear } from '@/lib/format';
import { AlertCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const userKey = useUserKey();
  const [from, setFrom] = useState(formatDateInput(startOfYear()));
  const [to, setTo] = useState(formatDateInput(endOfYear()));

  const { data: txns = [] } = useQuery({
    queryKey: ['report-txns', userKey, from, to],
    queryFn: () => listTransactions(userKey!, { from, to }),
    enabled: !!userKey,
  });
  const { data: coa = [] } = useQuery({
    queryKey: ['coa', userKey],
    queryFn: () => listCoa(userKey!),
    enabled: !!userKey,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', userKey],
    queryFn: () => listAccounts(userKey!),
    enabled: !!userKey,
  });

  const pl = useMemo(() => {
    const incomeMap = new Map<string, { name: string; amount: number }>();
    const expenseMap = new Map<string, { name: string; amount: number }>();
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (t.type === 'income') {
        income += Number(t.amount);
        const c = coa.find((x) => x.id === t.coa_id);
        const key = c?.id || 'uncat';
        const name = c ? `${c.code} · ${c.name}` : 'Uncategorized';
        const cur = incomeMap.get(key) ?? { name, amount: 0 };
        cur.amount += Number(t.amount);
        incomeMap.set(key, cur);
      } else if (t.type === 'expense') {
        const v = Math.abs(Number(t.amount));
        expense += v;
        const c = coa.find((x) => x.id === t.coa_id);
        const key = c?.id || 'uncat';
        const name = c ? `${c.code} · ${c.name}` : 'Uncategorized';
        const cur = expenseMap.get(key) ?? { name, amount: 0 };
        cur.amount += v;
        expenseMap.set(key, cur);
      }
    }
    return {
      income,
      expense,
      net: income - expense,
      incomeRows: Array.from(incomeMap.values()).sort((a, b) => b.amount - a.amount),
      expenseRows: Array.from(expenseMap.values()).sort((a, b) => b.amount - a.amount),
    };
  }, [txns, coa]);

  const balanceSheet = useMemo(() => {
    // Simple: cash on hand from accounts opening balance + net cash flow up to "to"
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      if (a.archived) continue;
      const v = Number(a.opening_balance);
      if (a.type === 'credit_card' || a.type === 'loan') liabilities += Math.abs(v);
      else assets += v;
    }
    // Adjust assets by net cash from transactions in window
    let netCash = 0;
    for (const t of txns) {
      if (t.type === 'income') netCash += Number(t.amount);
      if (t.type === 'expense') netCash -= Math.abs(Number(t.amount));
    }
    assets += netCash;
    return { assets, liabilities, equity: assets - liabilities };
  }, [accounts, txns]);

  const uncategorizedCount = useMemo(
    () => txns.filter((t) => (t.type === 'income' || t.type === 'expense') && !t.coa_id).length,
    [txns],
  );

  const cashFlow = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of txns) {
      if (t.type === 'income') inflow += Number(t.amount);
      if (t.type === 'expense') outflow += Math.abs(Number(t.amount));
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [txns]);

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Profit & Loss, Balance Sheet, and Cash Flow over a date range."
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => { setFrom(formatDateInput(startOfMonth())); setTo(formatDateInput(endOfMonth())); }}>This month</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(formatDateInput(startOfYear())); setTo(formatDateInput(endOfYear())); }}>This year</Button>
          </div>
        </CardContent>
      </Card>

      {uncategorizedCount > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-medium">{uncategorizedCount}</span>{' '}
              transaction{uncategorizedCount === 1 ? '' : 's'} couldn't be auto-categorized to your Chart of Accounts.
              They appear under "Uncategorized" below.
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/transactions">Categorize</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Profit & Loss</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(`oblo-pl-${from}-to-${to}.csv`, [
                    ['Section', 'Account', 'Amount'],
                    ...pl.incomeRows.map((r) => ['Income', r.name, r.amount.toFixed(2)]),
                    ['', 'Total Income', pl.income.toFixed(2)],
                    ...pl.expenseRows.map((r) => ['Expense', r.name, r.amount.toFixed(2)]),
                    ['', 'Total Expense', pl.expense.toFixed(2)],
                    ['', 'Net Income', pl.net.toFixed(2)],
                  ])
                }
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <Section title="Income" rows={pl.incomeRows} total={pl.income} positive />
              <Section title="Expenses" rows={pl.expenseRows} total={pl.expense} />
              <div className="flex items-center justify-between border-t-2 border-foreground pt-3">
                <span className="font-semibold">Net Income</span>
                <span className={cn('font-bold tabular-nums text-lg', pl.net >= 0 ? 'money-positive' : 'money-negative')}>
                  {formatCurrency(pl.net)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Balance Sheet</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(`oblo-bs-${to}.csv`, [
                    ['Section', 'Amount'],
                    ['Assets', balanceSheet.assets.toFixed(2)],
                    ['Liabilities', balanceSheet.liabilities.toFixed(2)],
                    ['Equity', balanceSheet.equity.toFixed(2)],
                  ])
                }
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Total Assets" value={balanceSheet.assets} bold />
              <Row label="Total Liabilities" value={balanceSheet.liabilities} negative />
              <div className="flex items-center justify-between border-t-2 border-foreground pt-3">
                <span className="font-semibold">Equity</span>
                <span className="font-bold tabular-nums text-lg">{formatCurrency(balanceSheet.equity)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cf">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Cash Flow</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(`oblo-cf-${from}-to-${to}.csv`, [
                    ['Inflow', cashFlow.inflow.toFixed(2)],
                    ['Outflow', cashFlow.outflow.toFixed(2)],
                    ['Net', cashFlow.net.toFixed(2)],
                  ])
                }
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Cash Inflow" value={cashFlow.inflow} positive />
              <Row label="Cash Outflow" value={cashFlow.outflow} negative />
              <div className="flex items-center justify-between border-t-2 border-foreground pt-3">
                <span className="font-semibold">Net Change</span>
                <span className={cn('font-bold tabular-nums text-lg', cashFlow.net >= 0 ? 'money-positive' : 'money-negative')}>
                  {formatCurrency(cashFlow.net)}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function Section({ title, rows, total, positive }: { title: string; rows: { name: string; amount: number }[]; total: number; positive?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="divide-y divide-border border border-border rounded-md">
        {rows.length === 0 && <div className="p-3 text-xs text-muted-foreground">No data.</div>}
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between px-3 py-2">
            <span className="text-sm">{r.name}</span>
            <span className={cn('text-sm tabular-nums', positive ? 'money-positive' : 'money-negative')}>
              {formatCurrency(r.amount)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
          <span className="text-sm font-semibold">Total {title}</span>
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, positive, negative }: { label: string; value: number; bold?: boolean; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn('text-sm', bold && 'font-semibold')}>{label}</span>
      <span className={cn('tabular-nums text-sm', bold && 'font-semibold', positive && 'money-positive', negative && 'money-negative')}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
