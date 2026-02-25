# Stock Metrics

Stock Metrics is a fast, free, static-first stock market web app inspired by screener.in, tickertape.in, and moneycontrol.in.

It ships with:
- `PRO` + `Beginner` modes
- Dark/Light theme toggle
- Universal search (US / India / Mutual Funds)
- Stock detail page (about, metrics, statements, charts, peer comparison, news, docs, notes)
- Rule-based AI layer (works without paid APIs)
- AI screener (rule parser) + built-in strategies
- Watchlist / Portfolio / Notes stored locally (IndexedDB)
- Learning tab with local markdown knowledge base + optional AI providers

## Non-negotiable goals covered

- **Zero paid API requirement**: app works with no API keys.
- **Fast UI**: React Query caching, debounced search, dynamic chart import, downsampling, virtualization, skeletons.
- **Easy setup**: `npm install && npm run dev`
- **Graceful degradation**: hides missing metrics instead of showing wrong placeholders.
- **Free deployment-friendly**: static-first pages + optional free serverless route handlers for proxy/caching.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- TanStack Query
- Recharts (charts)
- IndexedDB (`idb`) for local-first persistence
- SheetJS (`xlsx`) for Excel export
- Vitest (minimal unit tests)

## One-command setup

```bash
npm install && npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
```

## Run tests

```bash
npm test
```

## Free deployment (Cloudflare Pages)

This repo is **static-first**, but uses some optional Next route handlers (`/api/*`) to proxy free no-key providers (Yahoo chart, SEC, RSS, FX) and add cache headers. On Cloudflare Pages, use Next-on-Pages.

### Cloudflare Pages (recommended config)

1. Push repo to GitHub.
2. Create a new Cloudflare Pages project from the repo.
3. Use the following build settings:

- **Build command**: `npm run build:cloudflare`
- **Build output directory**: `.vercel/output/static`
- **Functions directory**: `.vercel/output/functions`

4. Environment variables are optional (only needed for optional AI/auth providers).

Notes:
- Cloudflare build environments are typically Node 20+, which is ideal for `@cloudflare/next-on-pages`.
- The app itself runs locally with no API keys and no backend setup.

## Alternative free deployment (Vercel)

- Import the repo into Vercel
- No env vars required for default mode
- Deploy with default `npm run build`

## Data Sources (free only) + fallback behavior

### Market prices/history
- **Yahoo Finance chart endpoint (no API key)** via local `/api/market/*` proxy
- If unavailable/rate-limited: **deterministic demo fallback history** (clearly labeled delayed/demo)

### Fundamentals
- **US**: SEC EDGAR Company Facts + filings (free)
- **India**: best-effort demo/curated fundamentals fallback (free public India fundamentals are often inconsistent without paid APIs)
- Missing metrics are **hidden** (not guessed)

### News
- **Google News RSS** (no key) via `/api/news`, filtered by ticker/company relevance
- Fallback demo news if feed fails

### FX (USD->INR)
- `open.er-api.com` (no key) via `/api/fx/usd-inr`
- Cached value in IndexedDB + stale fallback if request fails

## AI Layer (works offline/free by default)

### Default provider (no API key)
- Deterministic heuristics + templates
- Lexicon-based news sentiment
- Rule-based bull/bear periods, risk checks, fraud red flags
- Baseline trend forecasts
- Statement summaries (heuristic)
- Beginner “Should I consider buying?” panel (educational only)

### Optional providers
Configure via `.env` (not required):
- Local Ollama endpoint
- OpenAI-compatible endpoint

These are behind a provider interface (`src/lib/ai/*`) so the app works without them.

## Auth (optional, default local-only)

### Default
- **Guest mode / local demo auth** (no backend required)
- Local IndexedDB fake session + local username/email/password for demo UX
- Includes demo “Google” login button behavior for local adapter

### Optional Firebase Auth
- Adapter interface included (`src/lib/auth/*`)
- Set env vars and replace placeholder adapter with Firebase SDK integration if desired

## Feature map

### Dashboard (PRO + Beginner)
- Universal search
- Dashboard market tabs: US / Indian / Mutual Funds
- Stock detail page with:
  - About + website link
  - Key metrics (only available ones)
  - Income statements (P&L, Quarterly, Balance Sheet, Cash Flow)
  - Consolidated/Standalone toggle (UI + heuristic summary)
  - Charts (1M/6M/3Y/5Y/Max)
  - Shareholding pattern
  - AI insights (heuristic)
  - Peer comparison + manual compare input
  - Export to Excel (.xlsx)
  - News, documents, notes
  - US values currency toggle (USD/INR)
  - Market open/closed + last update + next open (IST display)

### Screener
- AI screener natural language parser (rule-based)
- Built-in strategies: Piotroski (approx), Magic Formula, Coffee Can, Quality, Value, Momentum
- Custom screens stored locally
- Virtualized results table

### Watchlist
- Multiple watchlists
- Local persistence
- Quick sparkline + short-term move indicator

### Portfolio
- Buy/sell transaction tracking
- Holdings + P&L + allocation bars
- Local persistence

### Learning
- Local markdown docs knowledge base
- Q&A assistant with heuristic retrieval/answers
- Optional Ollama/OpenAI-compatible provider support

## Folder structure

```text
src/
  app/            # App Router pages + api routes
  components/     # UI and feature components
  lib/            # data adapters, providers, AI, storage, utils
  stores/         # Zustand stores (theme/mode/auth)
  types/          # domain types
  content/        # learning markdown docs
tests/            # minimal unit tests
```

## Important transparency notes

- This app does **not** claim real-time market data.
- Data quality varies by symbol and market because only free sources are used.
- Some advanced fundamentals for Indian stocks are best-effort/demo unless a reliable free provider is added.
- When a metric is missing, the UI intentionally hides it.

## Optional configuration

Copy env file if needed:

```bash
cp .env.example .env.local
```

Only set variables if you want optional AI providers or optional Firebase auth.

## Future improvements (easy extensions)

- Add more India public data adapters (if stable and legally usable)
- Replace placeholder Firebase adapter with full SDK integration
- Add benchmark-based beta calculation with index history adapter
- Add service-worker caching for offline snapshots
