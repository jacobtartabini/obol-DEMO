import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import DemoTour from "@/demo/DemoTour";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Categories from "./pages/Categories";
import Recurring from "./pages/Recurring";
import Reports from "./pages/Reports";
import Insights from "./pages/Insights";
import Taxes from "./pages/Taxes";
import BusinessUnits from "./pages/BusinessUnits";
import Invoices from "./pages/Invoices";
import Receipts from "./pages/Receipts";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Investments from "./pages/Investments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Persist for 7d so the app boots with usable data offline.
      gcTime: 1000 * 60 * 60 * 24 * 7,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "obol-query-cache-v1",
  throttleTime: 1000,
});

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DemoTour />
            <Routes>
              {/* Protected app */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/investments" element={<Investments />} />
                <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/taxes" element={<Taxes />} />
                <Route path="/business-units" element={<BusinessUnits />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
