import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  FileBarChart,
  Menu,
  Repeat,
  ScanLine,
  FileText,
  Briefcase,
  PiggyBank,
  BookOpen,
  Tags,
  ShieldCheck,
  Settings,
  Sparkles,
  LogOut,
  Camera,
  type LucideIcon,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavEntry {
  title: string;
  url: string;
  icon: LucideIcon;
}

// 4 primary tabs in the bottom bar; Scan is the centerpiece for fast capture.
const tabs: NavEntry[] = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Activity', url: '/transactions', icon: Receipt },
  { title: 'Scan', url: '/receipts?action=scan', icon: Camera },
  { title: 'Accounts', url: '/accounts', icon: Wallet },
];

const drawerSections: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Transactions', url: '/transactions', icon: Receipt },
      { title: 'Accounts', url: '/accounts', icon: Wallet },
      { title: 'Recurring', url: '/recurring', icon: Repeat },
      { title: 'Receipts', url: '/receipts', icon: ScanLine },
    ],
  },
  {
    label: 'Business',
    items: [
      { title: 'Invoices', url: '/invoices', icon: FileText },
      { title: 'Business Units', url: '/business-units', icon: Briefcase },
    ],
  },
  {
    label: 'Insights',
    items: [
      { title: 'Reports', url: '/reports', icon: FileBarChart },
      { title: 'AI Insights', url: '/insights', icon: Sparkles },
      { title: 'Taxes', url: '/taxes', icon: PiggyBank },
    ],
  },
  {
    label: 'Setup',
    items: [
      { title: 'Chart of Accounts', url: '/chart-of-accounts', icon: BookOpen },
      { title: 'Categories', url: '/categories', icon: Tags },
      { title: 'Audit Log', url: '/audit', icon: ShieldCheck },
      { title: 'Settings', url: '/settings', icon: Settings },
    ],
  },
];

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const { userKey, logout } = useAuth();
  const location = useLocation();
  const isActive = (url: string) => {
    const path = url.split('?')[0];
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  };

  return (
    <header
      className="md:hidden h-14 border-b border-border flex items-center justify-between px-3 bg-surface/80 backdrop-blur-md sticky top-0 z-30"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1.5">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[82%] max-w-[320px] p-0 flex flex-col">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2.5 text-left">
              <img src="/logo2.png" alt="Obol" className="h-8 w-8 rounded-lg object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">Obol</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Accounting
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {drawerSections.map((section) => (
              <div key={section.label} className="mb-3">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.url}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-foreground hover:bg-accent/50',
                          )
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className="border-t border-border px-3 py-3 space-y-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            {userKey && (
              <div className="text-[11px] text-muted-foreground truncate" title={userKey}>
                {userKey}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <img src="/logo2.png" alt="Obol" className="h-7 w-7 rounded-md object-contain" />
        <span className="text-sm font-semibold">
          {tabs.find((t) => isActive(t.url))?.title ??
            (location.pathname === '/'
              ? 'Home'
              : location.pathname.replace('/', '').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()))}
        </span>
      </div>

      <div className="w-9" /> {/* spacer to balance */}
    </header>
  );
}

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (url: string) => {
    const path = url.split('?')[0];
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = isActive(tab.url);
          return (
            <li key={tab.url}>
              <button
                onClick={() => navigate(tab.url)}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                )}
              >
                <tab.icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                  {tab.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
