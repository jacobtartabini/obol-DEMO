import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserKey } from '@/providers/AuthProvider';
import {
  listLinkedAccounts,
  listPlaidHoldings,
  syncPlaidHoldings,
  type PlaidHolding,
  type PlaidLinkedAccount,
} from '@/lib/plaid';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/format';
import { RefreshCw, TrendingUp, Briefcase, BarChart3, Info } from 'lucide-react';
import { PlaidConnectButton } from '@/components/plaid/PlaidConnectButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function securityTypeLabel(type: string | null): string {
  if (!type) return 'Other';
  const map: Record<string, string> = {
    equity: 'Stock',
    etf: 'ETF',
    mutual_fund: 'Mutual Fund',
    fixed_income: 'Bond',
    cash: 'Cash',
    derivative: 'Derivative',
    cryptocurrency: 'Crypto',
  };
  return map[type.toLowerCase()] ?? type;
}

function gainLossColor(value: number | null, cost: number | null) {
  if (value == null || cost == null || cost === 0) return '';
  return value >= cost ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
}

export default function Investments() {
  const userKey = useUserKey();
  const qc = useQueryClient();

  const demoAccounts: PlaidLinkedAccount[] = [
    {
      id: 'demo-investment-1',
      plaid_item_id: 'demo-item-1',
      plaid_account_id: 'demo-plaid-account-1',
      institution_name: 'Fidelity',
      institution_logo: null,
      account_mask: '3841',
      account_name: 'Brokerage',
      account_type: 'investment',
      account_subtype: 'brokerage',
      current_balance: 128_430.12,
      available_balance: null,
      currency: 'USD',
      last_synced_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      error_code: null,
      error_message: null,
      is_active: true,
    },
    {
      id: 'demo-investment-2',
      plaid_item_id: 'demo-item-2',
      plaid_account_id: 'demo-plaid-account-2',
      institution_name: 'Vanguard',
      institution_logo: null,
      account_mask: '1108',
      account_name: 'Roth IRA',
      account_type: 'investment',
      account_subtype: 'ira',
      current_balance: 74_980.55,
      available_balance: null,
      currency: 'USD',
      last_synced_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      error_code: null,
      error_message: null,
      is_active: true,
    },
  ];

  const demoHoldings: PlaidHolding[] = [
    {
      id: 'demo-holding-1',
      linked_account_id: 'demo-investment-1',
      plaid_account_id: 'demo-plaid-account-1',
      plaid_security_id: 'demo-sec-voo',
      security_name: 'Vanguard S&P 500 ETF',
      ticker_symbol: 'VOO',
      security_type: 'etf',
      close_price: 492.31,
      close_price_as_of: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      quantity: 120.5,
      institution_price: 492.31,
      institution_price_as_of: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      institution_value: 59_318.36,
      cost_basis: 51_900.0,
      currency: 'USD',
      last_updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    {
      id: 'demo-holding-2',
      linked_account_id: 'demo-investment-1',
      plaid_account_id: 'demo-plaid-account-1',
      plaid_security_id: 'demo-sec-msft',
      security_name: 'Microsoft Corp.',
      ticker_symbol: 'MSFT',
      security_type: 'equity',
      close_price: 429.18,
      close_price_as_of: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      quantity: 40,
      institution_price: 429.18,
      institution_price_as_of: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      institution_value: 17_167.2,
      cost_basis: 12_800.0,
      currency: 'USD',
      last_updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    {
      id: 'demo-holding-3',
      linked_account_id: 'demo-investment-1',
      plaid_account_id: 'demo-plaid-account-1',
      plaid_security_id: 'demo-sec-tlt',
      security_name: 'iShares 20+ Year Treasury Bond ETF',
      ticker_symbol: 'TLT',
      security_type: 'etf',
      close_price: 94.77,
      close_price_as_of: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      quantity: 250,
      institution_price: 94.77,
      institution_price_as_of: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      institution_value: 23_692.5,
      cost_basis: 25_400.0,
      currency: 'USD',
      last_updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    {
      id: 'demo-holding-4',
      linked_account_id: 'demo-investment-2',
      plaid_account_id: 'demo-plaid-account-2',
      plaid_security_id: 'demo-sec-vtsax',
      security_name: 'Vanguard Total Stock Market Index Fund Admiral Shares',
      ticker_symbol: 'VTSAX',
      security_type: 'mutual_fund',
      close_price: 139.91,
      close_price_as_of: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      quantity: 380.2,
      institution_price: 139.91,
      institution_price_as_of: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
      institution_value: 53_191.68,
      cost_basis: 44_600.0,
      currency: 'USD',
      last_updated_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    },
    {
      id: 'demo-holding-5',
      linked_account_id: 'demo-investment-2',
      plaid_account_id: 'demo-plaid-account-2',
      plaid_security_id: 'demo-sec-bnd',
      security_name: 'Vanguard Total Bond Market ETF',
      ticker_symbol: 'BND',
      security_type: 'etf',
      close_price: 72.44,
      close_price_as_of: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      quantity: 300,
      institution_price: 72.44,
      institution_price_as_of: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
      institution_value: 21_732.0,
      cost_basis: 20_400.0,
      currency: 'USD',
      last_updated_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    },
  ];

  const { data: allAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['plaid-accounts', userKey],
    queryFn: () => listLinkedAccounts(),
    enabled: !!userKey,
  });

  const { data: holdings = [], isLoading: loadingHoldings } = useQuery({
    queryKey: ['plaid-holdings', userKey],
    queryFn: () => listPlaidHoldings(),
    enabled: !!userKey,
  });

  const syncHoldings = useMutation({
    mutationFn: () => syncPlaidHoldings(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['plaid-holdings'] });
      qc.invalidateQueries({ queryKey: ['plaid-accounts'] });
      toast.success(`Holdings updated — ${r.total_synced} position${r.total_synced === 1 ? '' : 's'} synced`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const investmentAccounts = allAccounts.filter(
    (a) => a.account_type?.toLowerCase() === 'investment',
  );
  const hasLinkedAccounts = allAccounts.length > 0;

  const totalPortfolio = investmentAccounts.reduce(
    (sum, a) => sum + (a.current_balance ?? 0),
    0,
  );

  const totalCostBasis = holdings.reduce(
    (sum, h) => sum + (h.cost_basis ?? 0),
    0,
  );
  const totalHoldingsValue = holdings.reduce(
    (sum, h) => sum + (h.institution_value ?? 0),
    0,
  );
  const totalGainLoss = totalHoldingsValue - totalCostBasis;
  const hasHoldings = holdings.length > 0;
  const hasInvestmentAccounts = investmentAccounts.length > 0;

  const demoMode = !loadingAccounts && !loadingHoldings && !hasLinkedAccounts && !hasHoldings;

  const displayAccounts = demoMode ? demoAccounts : allAccounts;
  const displayInvestmentAccounts = demoMode
    ? demoAccounts
    : allAccounts.filter((a) => a.account_type?.toLowerCase() === 'investment');
  const displayHoldings = demoMode ? demoHoldings : holdings;

  const displayTotalPortfolio = displayInvestmentAccounts.reduce(
    (sum, a) => sum + (a.current_balance ?? 0),
    0,
  );
  const displayTotalCostBasis = displayHoldings.reduce((sum, h) => sum + (h.cost_basis ?? 0), 0);
  const displayTotalHoldingsValue = displayHoldings.reduce(
    (sum, h) => sum + (h.institution_value ?? 0),
    0,
  );
  const displayGainLoss = displayTotalHoldingsValue - displayTotalCostBasis;

  // Group holdings by account
  const holdingsByAccount = displayHoldings.reduce<Record<string, typeof displayHoldings>>(
    (acc, h) => {
      const key = h.linked_account_id ?? h.plaid_account_id;
      acc[key] = [...(acc[key] ?? []), h];
      return acc;
    },
    {},
  );

  const accountMap = new Map(displayAccounts.map((a) => [a.id, a]));

  return (
    <PageContainer>
      <PageHeader
        title="Investments"
        description="Portfolio balances and holdings from connected investment accounts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncHoldings.mutate()}
              disabled={syncHoldings.isPending || !hasInvestmentAccounts || demoMode}
            >
              <RefreshCw className={cn('h-4 w-4', syncHoldings.isPending && 'animate-spin')} />
              Sync holdings
            </Button>
            <PlaidConnectButton />
          </div>
        }
      />

      {demoMode && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Showing <strong>demo investments</strong> because bank linking is disabled in this static
            demo build. Metrics and positions below are sample data for UI preview.
          </AlertDescription>
        </Alert>
      )}

      {/* No investment accounts at all */}
      {!loadingAccounts && !hasInvestmentAccounts && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            No investment accounts connected yet. Click <strong>Connect bank</strong> to link your
            brokerage or investment account (e.g. Edward Jones, Fidelity, Schwab, Vanguard).
          </AlertDescription>
        </Alert>
      )}

      {/* Holdings not available — accounts connected but no holdings data */}
      {!loadingHoldings && hasInvestmentAccounts && !hasHoldings && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your investment account is connected, but individual holdings aren't available yet.
            Click <strong>Sync holdings</strong> to fetch them, or reconnect via{' '}
            <strong>Connect bank</strong> to re-authorize with holdings access.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Portfolio value</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {formatCurrency(demoMode ? displayTotalPortfolio : totalPortfolio)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {demoMode ? displayInvestmentAccounts.length : investmentAccounts.length} account
              {(demoMode ? displayInvestmentAccounts.length : investmentAccounts.length) !== 1
                ? 's'
                : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total gain / loss</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            {(demoMode ? displayHoldings.length > 0 : hasHoldings) &&
            (demoMode ? displayTotalCostBasis : totalCostBasis) > 0 ? (
              <>
                <div
                  className={cn(
                    'text-2xl font-semibold tabular-nums',
                    (demoMode ? displayGainLoss : totalGainLoss) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {(demoMode ? displayGainLoss : totalGainLoss) >= 0 ? '+' : ''}
                  {formatCurrency(demoMode ? displayGainLoss : totalGainLoss)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  vs {formatCurrency(demoMode ? displayTotalCostBasis : totalCostBasis)} cost basis
                </div>
              </>
            ) : (
              <div className="text-2xl font-semibold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Positions</span>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {demoMode ? displayHoldings.length : holdings.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(demoMode ? displayHoldings.length > 0 : hasHoldings)
                ? `Last updated ${new Date(
                    (demoMode ? displayHoldings : holdings)[0].last_updated_at,
                  ).toLocaleDateString()}`
                : 'No holdings data yet'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts (all linked accounts) */}
      {(hasLinkedAccounts || demoMode) && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Accounts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Last synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayAccounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{a.institution_name}</div>
                      {a.error_message && (
                        <div className="text-xs text-destructive">{a.error_message}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.account_name ?? '—'}
                      {a.account_mask && <span className="ml-1">····{a.account_mask}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {a.account_subtype ?? a.account_type ?? 'account'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {a.current_balance != null
                        ? formatCurrency(Number(a.current_balance), a.currency ?? 'USD')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Investment accounts overview */}
      {(hasInvestmentAccounts || demoMode) && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Investment accounts{' '}
              {demoMode && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Demo data
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Last synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayInvestmentAccounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{a.institution_name}</div>
                      {a.error_message && (
                        <div className="text-xs text-destructive">{a.error_message}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.account_name ?? '—'}
                      {a.account_mask && <span className="ml-1">····{a.account_mask}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {a.account_subtype ?? a.account_type ?? 'investment'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {a.current_balance != null
                        ? formatCurrency(Number(a.current_balance), a.currency ?? 'USD')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Holdings by account */}
      {(hasHoldings || demoMode) && (
        <div className="space-y-4">
          {Object.entries(holdingsByAccount).map(([key, accountHoldings]) => {
            const linkedAccount = accountMap.get(key);
            const accountLabel = linkedAccount
              ? `${linkedAccount.institution_name} — ${linkedAccount.account_name ?? ''}${linkedAccount.account_mask ? ` ····${linkedAccount.account_mask}` : ''}`
              : 'Investment account';
            const accountValue = accountHoldings.reduce(
              (s, h) => s + (h.institution_value ?? 0),
              0,
            );

            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{accountLabel}</CardTitle>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(accountValue)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Security</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Gain / Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountHoldings.map((h) => {
                        const gainLoss =
                          h.institution_value != null && h.cost_basis != null
                            ? h.institution_value - h.cost_basis
                            : null;

                        return (
                          <TableRow key={h.id}>
                            <TableCell>
                              <div className="font-medium text-sm">
                                {h.ticker_symbol ? (
                                  <>
                                    <span className="font-mono">{h.ticker_symbol}</span>
                                    {h.security_name && (
                                      <span className="ml-1 text-muted-foreground font-normal">
                                        {h.security_name}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  h.security_name ?? h.plaid_security_id
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {securityTypeLabel(h.security_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {h.quantity != null ? Number(h.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {h.institution_price != null
                                ? formatCurrency(Number(h.institution_price), h.currency)
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-medium">
                              {h.institution_value != null
                                ? formatCurrency(Number(h.institution_value), h.currency)
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {gainLoss != null ? (
                                <span className={gainLossColor(h.institution_value, h.cost_basis)}>
                                  {gainLoss >= 0 ? '+' : ''}
                                  {formatCurrency(gainLoss, h.currency)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {loadingHoldings && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading holdings…
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
