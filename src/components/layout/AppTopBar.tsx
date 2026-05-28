import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/providers/AuthProvider';

const ROUTE_CRUMBS: { prefix: string; label: string; parent?: string }[] = [
  { prefix: '/', label: 'Overview', parent: 'Dashboard' },
  { prefix: '/transactions', label: 'Transactions', parent: 'Activity' },
  { prefix: '/accounts', label: 'Accounts', parent: 'Finance' },
  { prefix: '/investments', label: 'Investments', parent: 'Finance' },
  { prefix: '/recurring', label: 'Recurring', parent: 'Finance' },
  { prefix: '/receipts', label: 'Receipts', parent: 'Finance' },
  { prefix: '/invoices', label: 'Invoices', parent: 'Business' },
  { prefix: '/business-units', label: 'Business Units', parent: 'Business' },
  { prefix: '/reports', label: 'Reports', parent: 'Insights' },
  { prefix: '/insights', label: 'AI Insights', parent: 'Insights' },
  { prefix: '/taxes', label: 'Taxes', parent: 'Insights' },
  { prefix: '/chart-of-accounts', label: 'Chart of Accounts', parent: 'Setup' },
  { prefix: '/categories', label: 'Categories', parent: 'Setup' },
  { prefix: '/audit', label: 'Audit Log', parent: 'Setup' },
  { prefix: '/settings', label: 'Settings', parent: 'Setup' },
];

export function displayNameFromKey(userKey: string | null): string {
  if (!userKey) return 'there';
  const base = userKey.includes('@') ? userKey.split('@')[0] : userKey.split('/').pop() ?? userKey;
  const cleaned = base.replace(/[._-]/g, ' ').trim();
  if (!cleaned) return 'there';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function initialsFromKey(userKey: string | null): string {
  const name = displayNameFromKey(userKey);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AppTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userKey } = useAuth();
  const [search, setSearch] = useState('');

  const crumb = useMemo(() => {
    const match =
      ROUTE_CRUMBS.filter((r) => r.prefix !== '/' && location.pathname.startsWith(r.prefix)).sort(
        (a, b) => b.prefix.length - a.prefix.length,
      )[0] ?? ROUTE_CRUMBS[0];
    return match;
  }, [location.pathname]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/transactions?q=${encodeURIComponent(q)}`);
    else navigate('/transactions');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById('app-topbar-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="hidden md:flex h-14 border-b border-border items-center gap-4 px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <SidebarTrigger className="h-8 w-8 shrink-0 text-muted-foreground" />

      <nav className="flex items-center gap-1 text-sm shrink-0 min-w-0">
        <span className="text-muted-foreground">{crumb.parent ?? 'Obol'}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <span className="font-medium text-foreground truncate">{crumb.label}</span>
      </nav>

      <form onSubmit={onSearchSubmit} className="flex-1 max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="app-topbar-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="h-9 pl-9 pr-16 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-border rounded-lg"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </form>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <ThemeToggle />
        <Link
          to="/settings"
          className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
          title={userKey ?? 'Account'}
        >
          {initialsFromKey(userKey)}
        </Link>
      </div>
    </header>
  );
}
