import { ReactNode, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { MobileTopBar, MobileBottomNav } from './MobileNav';

interface AppShellProps {
  children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // PWA / mobile launch → open straight to receipt scanning for fast capture.
  useEffect(() => {
    if (location.pathname !== '/') return;
    if (sessionStorage.getItem('obol-pwa-routed') === '1') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isStandalone || isMobile) {
      sessionStorage.setItem('obol-pwa-routed', '1');
      navigate('/receipts', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--surface))]">
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <MobileTopBar />
          <AppTopBar />

          <main className="flex-1 overflow-auto pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-0">
            {children ?? <Outlet />}
          </main>

          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
