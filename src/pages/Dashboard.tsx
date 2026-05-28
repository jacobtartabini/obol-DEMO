import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserKey } from '@/providers/AuthProvider';
import { listTransactions, listAccounts, listCategories, listCoa } from '@/lib/api';
import { coaLabelById } from '@/lib/coa';
import { listLinkedAccounts, syncPlaidTransactions } from '@/lib/plaid';
import { PageContainer } from '@/components/layout/PageHeader';
import { displayNameFromKey } from '@/components/layout/AppTopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, startOfMonth, endOfMonth, formatDateInput } from '@/lib/format';
import {
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { Transaction, TxnStatus } from '@/types/db';

type ChartPeriod = 'weekly' | 'monthly' | 'yearly';

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

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function formatDelta(pct: number | null, invert = false): { text: string; positive: boolean } {
  if (pct === null) return { text: 'New this period', positive: true };
  const effective = invert ? -pct : pct;
  const sign = effective >= 0 ? '+' : '';
  return {
    text: `${sign}${effective.toFixed(1)}% vs last month`,
    positive: effective >= 0,
  };
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  return (
    <svg viewBox="0 0 56 24" className={cn('h-6 w-14', className)} aria-hidden>
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * 22);
        return (
          <rect
            key={i}
            x={i * 9 + 1}
            y={24 - h}
            width={6}
            height={h}
            rx={1}
            className="fill-foreground/15"
          />
        );
      })}
    </svg>
  );
}

const STATUS_STYLES: Record<TxnStatus, { label: string; className: string }> = {
  cleared: { label: 'Cleared', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
  reconciled: { label: 'Reconciled', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
  void: { label: 'Void', className: 'bg-muted text-muted-foreground border-border' },
};

export default function Dashboard() {
  const userKey = useUserKey();
  const displayName = displayNameFromKey(userKey);
  const monthStart = formatDateInput(startOfMonth());
  const monthEnd = formatDateInput(endOfMonth());
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('monthly');
  const [tableSearch, setTableSearch] = useState('');

  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonthStart = formatDateInput(startOfMonth(prevMonthDate));
  const prevMonthEnd = formatDateInput(endOfMonth(prevMonthDate));

  const chartRangeStart = useMemo(() => {
    const today = new Date();
    if (chartPeriod === 'weekly') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return formatDateInput(d);
    }
    if (chartPeriod === 'yearly') {
      const d = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      return formatDateInput(d);
    }
    return monthStart;
  }, [chartPeriod, monthStart]);

  const { data: txns = [], isLoading: loadingTxns } = useQuery({
    queryKey: ['dash-txns', userKey, monthStart, monthEnd],
    queryFn: () => listTransactions(userKey!, { from: monthStart, to: monthEnd }),
    enabled: !!userKey,
  });

  const { data: prevTxns = [] } = useQuery({
    queryKey: ['dash-prev-txns', userKey, prevMonthStart, prevMonthEnd],
    queryFn: () => listTransactions(userKey!, { from: prevMonthStart, to: prevMonthEnd }),
    enabled: !!userKey,
  });

  const { data: chartTxns = [] } = useQuery({
    queryKey: ['dash-chart-txns', userKey, chartRangeStart, monthEnd, chartPeriod],
    queryFn: () => listTransactions(userKey!, { from: chartRangeStart, to: monthEnd }),
    enabled: !!userKey,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['dash-accounts', userKey],
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

  const qc = useQueryClient();
  const { data: linkedAccounts = [] } = useQuery({
    queryKey: ['plaid-accounts', userKey],
    queryFn: () => listLinkedAccounts(),
    enabled: !!userKey,
  });

  const syncedRef = useRef(false);
  useEffect(() => {
    if (!userKey || syncedRef.current || linkedAccounts.length === 0) return;
    syncedRef.current = true;
    syncPlaidTransactions()
      .then(() => {
        qc.invalidateQueries({ queryKey: ['dash-txns'] });
        qc.invalidateQueries({ queryKey: ['dash-recent'] });
        qc.invalidateQueries({ queryKey: ['plaid-accounts'] });
        qc.invalidateQueries({ queryKey: ['txns'] });
        qc.invalidateQueries({ queryKey: ['report-txns'] });
        qc.invalidateQueries({ queryKey: ['recurring'] });
      })
      .catch(() => {});
  }, [userKey, linkedAccounts.length, qc]);

  const { data: recent = [] } = useQuery({
    queryKey: ['dash-recent', userKey],
    queryFn: () => listTransactions(userKey!, { limit: 12 }),
    enabled: !!userKey,
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    txns.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') expense += Math.abs(Number(t.amount));
    });
    return { income, expense, net: income - expense };
  }, [txns]);

  const prevStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    prevTxns.forEach((t) => {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') expense += Math.abs(Number(t.amount));
    });
    return { income, expense, net: income - expense };
  }, [prevTxns]);

  const { totalCash, totalInvestments, netWorth } = useMemo(() => {
    const active = accounts.filter((a) => !a.archived);
    const cash = active
      .filter((a) => a.type !== 'investment')
      .reduce((sum, a) => sum + Number(a.opening_balance), 0);
    const investments = active
      .filter((a) => a.type === 'investment')
      .reduce((sum, a) => sum + Number(a.opening_balance), 0);
    return { totalCash: cash, totalInvestments: investments, netWorth: cash + investments };
  }, [accounts]);

  const savingsRate = stats.income > 0 ? Math.round((stats.net / stats.income) * 100) : null;

  const dailySpark = useMemo(() => {
    const days: number[] = [];
    const start = startOfMonth();
    const today = new Date();
    const d = new Date(start);
    while (d <= today && days.length < 7) {
      const key = formatDateInput(new Date(d));
      let inc = 0;
      let exp = 0;
      txns.forEach((t) => {
        if (t.txn_date !== key) return;
        if (t.type === 'income') inc += Number(t.amount);
        else if (t.type === 'expense') exp += Math.abs(Number(t.amount));
      });
      days.push(inc - exp);
      d.setDate(d.getDate() + 1);
    }
    while (days.length < 7) days.unshift(0);
    return days.slice(-7);
  }, [txns]);

  const incomeSpark = useMemo(() => {
    const vals: number[] = [];
    const start = startOfMonth();
    const d = new Date(start);
    const today = new Date();
    while (d <= today && vals.length < 7) {
      const key = formatDateInput(new Date(d));
      vals.push(
        txns.filter((t) => t.txn_date === key && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      );
      d.setDate(d.getDate() + 1);
    }
    while (vals.length < 7) vals.unshift(0);
    return vals.slice(-7);
  }, [txns]);

  const expenseSpark = useMemo(() => {
    const vals: number[] = [];
    const start = startOfMonth();
    const d = new Date(start);
    const today = new Date();
    while (d <= today && vals.length < 7) {
      const key = formatDateInput(new Date(d));
      vals.push(
        txns
          .filter((t) => t.txn_date === key && t.type === 'expense')
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
      );
      d.setDate(d.getDate() + 1);
    }
    while (vals.length < 7) vals.unshift(0);
    return vals.slice(-7);
  }, [txns]);

  const chartData = useMemo(() => {
    if (chartPeriod === 'yearly') {
      const months: { label: string; income: number; expense: number }[] = [];
      const today = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          label: d.toLocaleString('en-US', { month: 'short' }),
          income: 0,
          expense: 0,
        });
        const bucket = months[months.length - 1];
        chartTxns.forEach((t) => {
          if (!t.txn_date.startsWith(key)) return;
          if (t.type === 'income') bucket.income += Number(t.amount);
          else if (t.type === 'expense') bucket.expense += Math.abs(Number(t.amount));
        });
      }
      return months;
    }

    if (chartPeriod === 'weekly') {
      const days: { label: string; income: number; expense: number }[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = formatDateInput(d);
        const bucket = {
          label: d.toLocaleString('en-US', { weekday: 'short' }),
          income: 0,
          expense: 0,
        };
        chartTxns.forEach((t) => {
          if (t.txn_date !== key) return;
          if (t.type === 'income') bucket.income += Number(t.amount);
          else if (t.type === 'expense') bucket.expense += Math.abs(Number(t.amount));
        });
        days.push(bucket);
      }
      return days;
    }

    const days: { label: string; income: number; expense: number }[] = [];
    const start = startOfMonth();
    const today = new Date();
    const d = new Date(start);
    while (d <= today) {
      const key = formatDateInput(new Date(d));
      const bucket = {
        label: String(d.getDate()),
        income: 0,
        expense: 0,
      };
      chartTxns.forEach((t) => {
        if (t.txn_date !== key) return;
        if (t.type === 'income') bucket.income += Number(t.amount);
        else if (t.type === 'expense') bucket.expense += Math.abs(Number(t.amount));
      });
      days.push(bucket);
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [chartTxns, chartPeriod]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    txns.forEach((t) => {
      if (t.type !== 'expense') return;
      const coaName = t.coa_id ? coaLabelById(coa, t.coa_id) : null;
      const name =
        coaName && coaName !== '—'
          ? coaName
          : t.category_id
            ? categoryMap.get(t.category_id) ?? 'Uncategorized'
            : 'Uncategorized';
      map.set(name, (map.get(name) ?? 0) + Math.abs(Number(t.amount)));
    });
    return [...map.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [txns, categoryMap, coa]);

  const filteredRecent = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.merchant ?? '').toLowerCase().includes(q) ||
        (coaLabelById(coa, t.coa_id) ?? '').toLowerCase().includes(q) ||
        (categoryMap.get(t.category_id ?? '') ?? '').toLowerCase().includes(q),
    );
  }, [recent, tableSearch, categoryMap, coa]);

  const todayLabel = new Date().toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const exportRecentCsv = () => {
    downloadCSV(`obol-transactions-${formatDateInput()}.csv`, [
      ['Date', 'Description', 'Category', 'Type', 'Status', 'Amount'],
      ...filteredRecent.map((t) => [
        t.txn_date,
        t.description,
        t.coa_id && coaLabelById(coa, t.coa_id) !== '—'
          ? coaLabelById(coa, t.coa_id)
          : t.category_id
            ? categoryMap.get(t.category_id) ?? ''
            : '',
        t.type,
        t.status,
        t.type === 'expense' ? -Math.abs(Number(t.amount)) : Number(t.amount),
      ]),
    ]);
  };

  const kpis = [
    {
      label: 'Net worth',
      value: formatCurrency(netWorth),
      delta: null as number | null,
      invert: false,
      spark: dailySpark,
    },
    {
      label: 'Income (MTD)',
      value: formatCurrency(stats.income),
      delta: pctChange(stats.income, prevStats.income),
      invert: false,
      spark: incomeSpark,
    },
    {
      label: 'Expenses (MTD)',
      value: formatCurrency(stats.expense),
      delta: pctChange(stats.expense, prevStats.expense),
      invert: true,
      spark: expenseSpark,
    },
    {
      label: 'Savings rate',
      value: savingsRate !== null ? `${savingsRate}%` : '—',
      delta: pctChange(stats.net, prevStats.net),
      invert: false,
      spark: dailySpark,
    },
  ];

  return (
    <PageContainer>
      {/* Welcome row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {monthLabel} overview · Cash {formatCurrency(totalCash)}
            {totalInvestments > 0 && ` · Investments ${formatCurrency(totalInvestments)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="monthly">
            <SelectTrigger className="h-9 w-[110px] bg-card">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-9 px-3 rounded-lg border border-border bg-card text-sm flex items-center text-muted-foreground tabular-nums">
            {todayLabel}
          </div>
          <Button onClick={exportRecentCsv} className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const delta = formatDelta(kpi.delta, kpi.invert);
          return (
            <Card key={kpi.label} className="border-border/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <Sparkline values={kpi.spark} />
                </div>
                <p className="text-2xl font-semibold tabular-nums mt-2">{kpi.value}</p>
                {kpi.delta !== null && (
                  <p
                    className={cn(
                      'text-xs mt-2 font-medium',
                      delta.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                    )}
                  >
                    {delta.text}
                  </p>
                )}
                {kpi.delta === null && kpi.label === 'Net worth' && (
                  <p className="text-xs mt-2 text-muted-foreground">Across all accounts</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2 border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-base font-semibold">Cash flow trend</CardTitle>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(['weekly', 'monthly', 'yearly'] as ChartPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setChartPeriod(p)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors',
                    chartPeriod === p
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-foreground" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-foreground/25" />
                Expenses
              </span>
            </div>
            <div className="h-72 w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={chartData} barGap={2} barCategoryGap="20%">
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [formatCurrency(v), name]}
                  />
                  <Legend wrapperStyle={{ display: 'none' }} />
                  <Bar dataKey="income" name="Income" stackId="a" fill="hsl(var(--foreground))" radius={[0, 0, 0, 0]} />
                  <Bar
                    dataKey="expense"
                    name="Expenses"
                    stackId="a"
                    fill="hsl(var(--foreground) / 0.22)"
                    radius={[3, 3, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Expense breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expenses this month</p>
            ) : (
              <div className="h-48 w-full mb-4" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 4, right: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={72}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={14}>
                      {categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={`hsl(var(--foreground) / ${0.85 - i * 0.12})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <Link
              to="/reports"
              className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              View full reports for deeper analysis
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 pl-8 text-sm bg-muted/40 border-transparent"
                />
              </div>
              <Button asChild size="sm" className="h-8 gap-1.5 shrink-0">
                <Link to="/transactions?new=1">
                  <Plus className="h-3.5 w-3.5" />
                  Add transaction
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTxns && (
            <div className="p-8 text-sm text-muted-foreground text-center">Loading…</div>
          )}
          {!loadingTxns && filteredRecent.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">
              No transactions yet.{' '}
              <Link to="/transactions?new=1" className="text-primary underline">
                Add one
              </Link>
            </div>
          )}
          {filteredRecent.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                    Account
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecent.map((t) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    categoryName={
                      t.coa_id && coaLabelById(coa, t.coa_id) !== '—'
                        ? coaLabelById(coa, t.coa_id)
                        : t.category_id
                          ? categoryMap.get(t.category_id)
                          : undefined
                    }
                    accountName={t.account_id ? accountMap.get(t.account_id) : undefined}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function TransactionRow({
  txn,
  categoryName,
  accountName,
}: {
  txn: Transaction;
  categoryName?: string;
  accountName?: string;
}) {
  const status = STATUS_STYLES[txn.status] ?? STATUS_STYLES.cleared;

  return (
    <TableRow className="border-border/40 hover:bg-muted/30">
      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(txn.txn_date)}
      </TableCell>
      <TableCell>
        <div className="font-medium text-sm truncate max-w-[200px]">{txn.description}</div>
        {txn.merchant && (
          <div className="text-xs text-muted-foreground truncate">{txn.merchant}</div>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {categoryName ?? '—'}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] font-medium border', status.className)}>
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[120px]">
        {accountName ?? '—'}
      </TableCell>
      <TableCell
        className={cn(
          'text-right text-sm font-semibold tabular-nums',
          txn.type === 'income'
            ? 'money-positive'
            : txn.type === 'expense'
              ? 'money-negative'
              : 'money-neutral',
        )}
      >
        {txn.type === 'expense' ? '−' : txn.type === 'income' ? '+' : ''}
        {formatCurrency(Math.abs(Number(txn.amount)))}
      </TableCell>
      <TableCell>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link to="/transactions">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
