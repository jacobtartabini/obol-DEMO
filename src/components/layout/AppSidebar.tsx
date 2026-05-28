import {
  LayoutDashboard,
  Receipt,
  Wallet,
  BookOpen,
  FileBarChart,
  Repeat,
  Tags,
  ShieldCheck,
  Settings,
  PiggyBank,
  Briefcase,
  FileText,
  ScanLine,
  TrendingUp,
  Sparkles,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { displayNameFromKey, initialsFromKey } from './AppTopBar';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const tourAttrByUrl: Record<string, string | undefined> = {
  '/transactions': 'nav-transactions',
  '/reports': 'nav-reports',
  '/insights': 'nav-insights',
  '/settings': 'nav-settings',
};

const mainMenu: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Transactions', url: '/transactions', icon: Receipt },
  { title: 'Accounts', url: '/accounts', icon: Wallet },
  { title: 'Investments', url: '/investments', icon: TrendingUp },
];

const finance: NavItem[] = [
  { title: 'Recurring', url: '/recurring', icon: Repeat },
  { title: 'Receipts', url: '/receipts', icon: ScanLine },
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Business Units', url: '/business-units', icon: Briefcase },
];

const insights: NavItem[] = [
  { title: 'Reports', url: '/reports', icon: FileBarChart },
  { title: 'AI Insights', url: '/insights', icon: Sparkles },
  { title: 'Taxes', url: '/taxes', icon: PiggyBank },
];

const setup: NavItem[] = [
  { title: 'Chart of Accounts', url: '/chart-of-accounts', icon: BookOpen },
  { title: 'Categories', url: '/categories', icon: Tags },
  { title: 'Audit Log', url: '/audit', icon: ShieldCheck },
  { title: 'Settings', url: '/settings', icon: Settings },
];

function SectionGroup({ label, items }: { label: string; items: NavItem[] }) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <SidebarGroup className="px-1">
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  title={item.title}
                  data-tour={tourAttrByUrl[item.url]}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
                    active &&
                      'bg-card text-foreground font-medium shadow-sm border border-border/60 hover:bg-card',
                    collapsed && 'justify-center px-2',
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-foreground')} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { userKey, logout } = useAuth();
  const displayName = displayNameFromKey(userKey);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-3">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-card px-3 py-2.5 shadow-sm',
            collapsed && 'justify-center px-2',
          )}
        >
          <img
            src="/favicon.png"
            alt="Obol"
            className="h-7 w-7 object-contain shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">Obol Accounting</span>
              <span className="text-[10px] text-muted-foreground">Personal finance</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-1">
        <SectionGroup label="Main Menu" items={mainMenu} />
        <SectionGroup label="Finance" items={finance} />
        <SectionGroup label="Insights" items={insights} />
        <SectionGroup label="Settings" items={setup} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="rounded-xl border border-sidebar-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                {initialsFromKey(userKey)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">Account owner</p>
              </div>
            </div>
            <div className="pt-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                data-tour="reset-demo"
                onClick={() => {
                  if (!confirm('Reset demo data? This will clear local changes and reload the app.')) return;
                  logout();
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset demo data
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {initialsFromKey(userKey)}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
