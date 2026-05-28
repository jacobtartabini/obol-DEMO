import { getDemoState, mutateDemoState } from '@/demo/store';
import { listCategories, listTransactions } from '@/lib/api';

export interface AiSettingsStatus {
  configured: boolean;
  ai_enabled: boolean;
  share_merchant_names: boolean;
  share_transaction_notes: boolean;
}

export interface InsightKpi {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat' | 'unknown';
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
  note?: string;
}

export interface InsightPattern {
  title: string;
  description: string;
  category?: string;
  severity: 'info' | 'watch' | 'concern';
}

export interface InsightRecommendation {
  title: string;
  category?: string;
  impact: 'high' | 'medium' | 'low';
  effort?: 'easy' | 'moderate' | 'hard';
  estimatedMonthlySavings?: number;
  rationale: string;
  steps: string[];
}

export interface InsightAlert {
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface InsightReport {
  headline: string;
  summary: string;
  healthScore: { score: number; label: string; rationale: string };
  kpis: InsightKpi[];
  patterns?: InsightPattern[];
  recommendations: InsightRecommendation[];
  alerts?: InsightAlert[];
  dataQuality?: { uncategorizedShare?: number; notes?: string };
}

export interface AiInsightsResult {
  report: InsightReport | null;
  insight: string;
  contextSummary: unknown;
  model: string;
  source?: 'rules' | 'ai';
  generatedAt?: string;
  cached?: boolean;
}

export function getAiStatus(): Promise<AiSettingsStatus> {
  const s = getDemoState();
  return Promise.resolve(s.data.ai.status);
}

export function saveAiSettings(opts: {
  api_key?: string;
  ai_enabled?: boolean;
  share_merchant_names?: boolean;
  share_transaction_notes?: boolean;
}): Promise<{ ok: true }> {
  mutateDemoState((d) => {
    const prev = d.data.ai.status;
    d.data.ai.status = {
      configured: prev.configured || Boolean(opts.api_key?.trim()),
      ai_enabled: opts.ai_enabled ?? prev.ai_enabled,
      share_merchant_names: opts.share_merchant_names ?? prev.share_merchant_names,
      share_transaction_notes: opts.share_transaction_notes ?? prev.share_transaction_notes,
    };
  });
  return Promise.resolve({ ok: true });
}

export function clearAiKey(): Promise<{ ok: true }> {
  mutateDemoState((d) => {
    d.data.ai.status = {
      ...d.data.ai.status,
      configured: false,
      ai_enabled: false,
    };
  });
  return Promise.resolve({ ok: true });
}

export function fetchAiInsights(
  period: 'month' | 'quarter' | 'year' = 'month',
  force = false,
): Promise<AiInsightsResult> {
  void force;
  const userKey = getDemoState().userKey;
  return generateLocalInsights(userKey, period);
}

async function generateLocalInsights(userKey: string, period: 'month' | 'quarter' | 'year'): Promise<AiInsightsResult> {
  const days = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const [txns, cats] = await Promise.all([
    listTransactions(userKey, { from: fromStr, to: toStr }),
    listCategories(userKey),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c]));

  const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenses = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const net = income - expenses;

  const byCat = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== 'expense') continue;
    const cid = t.category_id ?? 'uncategorized';
    byCat.set(cid, (byCat.get(cid) ?? 0) + Math.abs(Number(t.amount || 0)));
  }
  const top = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cid, amount]) => ({
      cid,
      amount,
      name: cid === 'uncategorized' ? 'Uncategorized' : (catById.get(cid)?.name ?? 'Unknown'),
    }));

  const report: InsightReport = {
    headline: net >= 0 ? 'You’re cash-flow positive' : 'Spending is outpacing income',
    summary:
      `In the last ${days} days, you had ${txns.length} transaction${txns.length === 1 ? '' : 's'}. ` +
      `Net: ${net.toFixed(2)} (income ${income.toFixed(2)} vs expenses ${expenses.toFixed(2)}).`,
    healthScore: {
      score: Math.max(0, Math.min(100, Math.round(60 + (net / Math.max(1, expenses)) * 40))),
      label: net >= 0 ? 'healthy' : 'watch',
      rationale: net >= 0 ? 'Income covers expenses in this period.' : 'Expenses exceed income in this period.',
    },
    kpis: [
      { label: 'Net', value: net.toFixed(2), trend: 'unknown', tone: net >= 0 ? 'positive' : 'warning' },
      { label: 'Income', value: income.toFixed(2), trend: 'unknown', tone: 'neutral' },
      { label: 'Expenses', value: expenses.toFixed(2), trend: 'unknown', tone: expenses > income ? 'warning' : 'neutral' },
    ],
    recommendations: [
      {
        title: 'Categorize your top expenses',
        category: top[0]?.name,
        impact: 'medium',
        effort: 'easy',
        rationale: 'Better categorization improves reporting and tax workflows.',
        steps: ['Open Transactions', 'Filter “Uncategorized” or top merchants', 'Assign a category and (optional) CoA'],
      },
      {
        title: 'Review recurring subscriptions',
        impact: 'low',
        effort: 'easy',
        rationale: 'Recurring expenses are the easiest place to trim waste.',
        steps: ['Open Recurring', 'Confirm active subscriptions', 'Cancel or downgrade unused plans'],
      },
    ],
    patterns: top.length
      ? top.map((t) => ({
          title: `Top expense: ${t.name}`,
          description: `You spent about ${t.amount.toFixed(2)} in ${t.name} during this period.`,
          category: t.name,
          severity: 'info' as const,
        }))
      : [],
    alerts: [],
    dataQuality: {
      uncategorizedShare: (byCat.get('uncategorized') ?? 0) / Math.max(1, expenses),
      notes: 'This is a demo report generated locally (no network calls).',
    },
  };

  return {
    report,
    insight: '',
    contextSummary: { period: { from: fromStr, to: toStr } },
    model: 'demo-local',
    source: 'rules',
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}
