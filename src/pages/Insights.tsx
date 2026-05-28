import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAiInsights,
  getAiStatus,
  type InsightReport,
  type InsightKpi,
  type InsightPattern,
  type InsightRecommendation,
  type InsightAlert,
} from '@/lib/ai';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Settings2,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Target,
  CheckCircle2,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

type Period = 'month' | 'quarter' | 'year';

const toneClass: Record<InsightKpi['tone'], string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: 'text-foreground',
};

const impactBadge: Record<InsightRecommendation['impact'], string> = {
  high: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  medium: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const severityBadge: Record<InsightPattern['severity'], string> = {
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  watch: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  concern: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

const alertSeverity: Record<InsightAlert['severity'], string> = {
  low: 'border-sky-500/40 bg-sky-500/5',
  medium: 'border-amber-500/40 bg-amber-500/5',
  high: 'border-rose-500/50 bg-rose-500/5',
};

function TrendIcon({ trend }: { trend?: InsightKpi['trend'] }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5" />;
  if (trend === 'flat') return <Minus className="h-3.5 w-3.5" />;
  return null;
}

function HealthScoreCard({ report }: { report: InsightReport }) {
  const { score, label, rationale } = report.healthScore;
  const color =
    score >= 80 ? 'text-emerald-500' :
    score >= 60 ? 'text-sky-500' :
    score >= 40 ? 'text-amber-500' : 'text-rose-500';
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" strokeWidth="8" className="fill-none stroke-muted" />
              <circle
                cx="50" cy="50" r="42" strokeWidth="8"
                strokeLinecap="round"
                className={cn('fill-none transition-all', color)}
                stroke="currentColor"
                strokeDasharray={`${(score / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-bold', color)}>{score}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Financial Health</span>
            </div>
            <h3 className="text-lg font-semibold capitalize mb-1">{label.replace(/_/g, ' ')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{rationale}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiGrid({ kpis }: { kpis: InsightKpi[] }) {
  if (!kpis?.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {kpis.map((k, i) => (
        <Card key={i} className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{k.label}</div>
            <div className={cn('flex items-baseline gap-1.5 mb-1', toneClass[k.tone])}>
              <span className="text-xl font-bold">{k.value}</span>
              <TrendIcon trend={k.trend} />
            </div>
            {k.note && <div className="text-xs text-muted-foreground line-clamp-2">{k.note}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: InsightRecommendation }) {
  const savings = rec.estimatedMonthlySavings ?? 0;
  return (
    <Card className="hover:border-primary/40 transition-all">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold leading-snug">{rec.title}</h4>
              {rec.category && (
                <div className="text-xs text-muted-foreground mt-0.5">{rec.category}</div>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn('shrink-0 capitalize', impactBadge[rec.impact])}>
            {rec.impact} impact
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{rec.rationale}</p>

        {rec.steps?.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {rec.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {savings > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" />
              ~{formatCurrency(savings)}/mo
            </Badge>
          )}
          {rec.effort && (
            <Badge variant="outline" className="capitalize text-xs">
              {rec.effort}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PatternRow({ p }: { p: InsightPattern }) {
  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className="shrink-0 mt-0.5">
        <Badge variant="outline" className={cn('capitalize', severityBadge[p.severity])}>
          {p.severity}
        </Badge>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm">{p.title}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
        {p.category && (
          <div className="text-xs text-muted-foreground mt-1">{p.category}</div>
        )}
      </div>
    </div>
  );
}

function ReportView({ report }: { report: InsightReport }) {
  const totalSavings = (report.recommendations ?? []).reduce(
    (s, r) => s + (r.estimatedMonthlySavings ?? 0), 0,
  );
  return (
    <div className="space-y-6">
      {/* Headline */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-wider text-primary font-medium">Headline</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold leading-tight mb-2">{report.headline}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
          {totalSavings > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <Target className="h-4 w-4" />
              Potential monthly savings: <strong>{formatCurrency(totalSavings)}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health + KPIs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <HealthScoreCard report={report} />
        </div>
        <div className="lg:col-span-2">
          <KpiGrid kpis={report.kpis} />
        </div>
      </div>

      {/* Alerts */}
      {report.alerts && report.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alerts
          </h3>
          {report.alerts.map((a, i) => (
            <Card key={i} className={cn('border', alertSeverity[a.severity])}>
              <CardContent className="p-4 flex gap-3">
                <AlertTriangle className={cn(
                  'h-5 w-5 shrink-0 mt-0.5',
                  a.severity === 'high' ? 'text-rose-500' :
                  a.severity === 'medium' ? 'text-amber-500' : 'text-sky-500',
                )} />
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recommendations ({report.recommendations.length})
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {report.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {report.patterns && report.patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Patterns detected
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {report.patterns.map((p, i) => <PatternRow key={i} p={p} />)}
          </CardContent>
        </Card>
      )}

      {/* Data quality */}
      {report.dataQuality?.notes && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex gap-3 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium">Data quality</div>
              {typeof report.dataQuality.uncategorizedShare === 'number' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uncategorized expenses</span>
                    <span>{Math.round((report.dataQuality.uncategorizedShare ?? 0) * 100)}%</span>
                  </div>
                  <Progress value={(report.dataQuality.uncategorizedShare ?? 0) * 100} className="h-1.5" />
                </div>
              )}
              <p className="text-muted-foreground">{report.dataQuality.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Insights() {
  const [period, setPeriod] = useState<Period>('month');
  const [report, setReport] = useState<InsightReport | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ source?: 'rules' | 'ai'; generatedAt?: string; cached?: boolean }>({});

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: getAiStatus,
  });

  const generate = useMutation({
    mutationFn: (force: boolean) => fetchAiInsights(period, force),
    onSuccess: (data) => {
      setReport(data.report);
      setFallbackText(data.report ? null : data.insight);
      setMeta({ source: data.source, generatedAt: data.generatedAt, cached: data.cached });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aiActive = status?.configured && status.ai_enabled;
  const lastAnalyzed = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <PageContainer>
      <PageHeader
        title="Insights"
        description="Rule-based patterns, KPIs, and recommendations — optionally enhanced by Claude for natural-language summaries."
        actions={
          <Button variant="outline" asChild>
            <Link to="/settings">
              <Settings2 className="h-4 w-4" />
              AI settings
            </Link>
          </Button>
        }
      />

      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 py-4 text-sm">
          <Shield className="h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-muted-foreground">
            <p>
              Reports are computed locally from your aggregated category totals.
              {aiActive
                ? ' Claude Haiku only rewrites the headline, summary, and top-3 recommendation rationales — no raw transactions are sent.'
                : ' Add an Anthropic key in Settings to enable optional natural-language polish (rules engine works without it).'}
            </p>
            <p className="text-xs">
              Reports are cached per period and only regenerated when your data changes — use Refresh to force a rebuild.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={(v) => { setPeriod(v as Period); setReport(null); setMeta({}); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last month</SelectItem>
              <SelectItem value="quarter">Last quarter</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => generate.mutate(false)} disabled={generate.isPending || loadingStatus}>
            <Sparkles className="h-4 w-4" />
            {generate.isPending ? 'Analyzing…' : report ? 'Reload' : 'Generate insights'}
          </Button>
          {report && (
            <Button variant="outline" onClick={() => generate.mutate(true)} disabled={generate.isPending}>
              Force refresh
            </Button>
          )}
          {report && (
            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={cn(
                meta.source === 'ai'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border',
              )}>
                {meta.source === 'ai' ? 'AI-enhanced' : 'Rules engine'}
              </Badge>
              {meta.cached && <Badge variant="outline">Cached</Badge>}
              {lastAnalyzed && <span>Last analyzed: {lastAnalyzed}</span>}
            </div>
          )}
        </div>

        {generate.isPending && !report && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary animate-pulse" />
              Analyzing your spending patterns…
            </CardContent>
          </Card>
        )}

        {report && <ReportView report={report} />}

        {!report && fallbackText && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{fallbackText}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
