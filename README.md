# Obol Accounting (Demo)

Obol Accounting is a demo-first accounting and personal finance web app for single-owner businesses (e.g., a single-member LLC). It lets you track transactions, organize them into accounts/categories/chart-of-accounts, and generate reports, taxes views, and “AI insights” — all running locally with a sample dataset.

## Technologies used

- **Frontend framework**: React 18 + TypeScript
- **Build tooling**: Vite (SWC)
- **Routing**: React Router
- **State/data**: TanStack React Query + persisted query cache (localStorage)
- **UI**: Tailwind CSS + shadcn/ui (Radix UI primitives) + lucide-react icons
- **Forms/validation**: react-hook-form + zod
- **Charts**: Recharts
- **Onboarding**: react-joyride (guided demo tour)
- **PWA**: vite-plugin-pwa + Workbox
- **Testing**: Vitest + Testing Library

## Features

- **Dashboard**: Overview of recent activity and high-level summaries.
- **Transactions**: Create, edit, delete, search, and filter income/expenses/transfers; date-range filtering and quick summaries.
- **Accounts**: Track accounts used for transactions and transfers.
- **Categories**: Tag transactions for reporting and analysis.
- **Chart of Accounts (CoA)**: Assign CoA entries to transactions for accounting-style reporting.
- **Reports**: Summaries across your activity (categories / CoA).
- **Taxes**: Tax-oriented views (including tax-deductible flag support).
- **Receipts**: Upload/scan receipts and attach them to transactions (demo storage).
- **Audit log**: Basic audit-style history view (demo).
- **Settings**: Theme + demo-specific configuration.
- **Demo tour**: First-run guided walkthrough of key areas.
- **PWA install + shortcut**: Installable app with a “Scan Receipt” shortcut that deep-links into receipt capture.

## User capabilities

- **Record money movement**: Add income, expenses, and transfers between accounts.
- **Stay organized**: Assign categories, chart-of-accounts entries, and notes; mark transactions as tax-deductible.
- **Find anything fast**: Search and filter transactions by text, type, account, and date range.
- **Work with docs**: Capture/upload receipts and link them to transactions.
- **Learn from the data**: View reports and locally-generated “insights” based on recent activity.
- **Reset to a clean demo**: Restore the sample dataset at any time (useful for showing the product).

## Keyboard shortcuts

- **Focus transaction search**: `⌘K` / `Ctrl+K` (focuses the top bar search input on desktop)
- **Toggle sidebar**: `⌘B` / `Ctrl+B`

## Process / how it was built

- **Demo-first architecture**: Authentication and data access are implemented to run in a fully local demo mode (no required backend to start).
- **Data fetching pattern**: Pages use React Query for consistent fetching/mutations and cache invalidation, with a persisted cache so reloads feel instant.
- **Product-style UX**: Sidebar navigation, responsive layouts (desktop table + mobile swipe rows), and a first-run guided tour to reduce time-to-value.
- **PWA considerations**: Service worker registration is guarded to avoid preview/iframe issues, and the manifest includes a “Scan Receipt” shortcut that deep-links into the app.

## What you learned

- **Designing for realistic workflows**: Modeling transactions as income/expense/transfer forces cleaner UI, better reporting, and fewer edge cases.
- **Offline-ish UX**: Persisting query data and keeping demo state local makes the app feel fast and resilient even without a backend.
- **Shipping quality-of-life details**: Small touches like deep-links, keyboard shortcuts, and onboarding steps dramatically improve usability.

## Potential improvements

- **Real backend + multi-user auth**: Replace demo auth/state with production authentication and a durable database.
- **True file persistence**: Store receipts/docs in durable storage (and/or IndexedDB for offline-first) instead of in-memory blobs.
- **Bank connections**: Enable real Plaid linking and transaction sync (disabled in this static demo).
- **More accounting depth**: Reconciliation flows, rules, split transactions, and exports (CSV/QuickBooks).
- **Insights upgrades**: Swap the local rules-based insights for real model calls, caching, and explainability controls.

## How to run the project

### Prerequisites

- **Node.js** (recommended: current LTS)
- **npm**

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

- **Dev server**: `http://localhost:8080`

### Build & preview

```bash
npm run build
npm run preview
```

### Tests

```bash
npm test
```

## Demo video

- **Link**: Add your demo video link here (e.g. YouTube/Loom) — `TODO: insert demo video URL`
- **Optional embed**: If you add a local file at `./demo/demo.mp4`, you can embed it like this:

```html
<!-- Replace with your real video path or hosted URL -->
<video src="./demo/demo.mp4" controls muted playsinline style="max-width: 100%;"></video>
```

# Welcome to your Lovable project

TODO: Document your project here
