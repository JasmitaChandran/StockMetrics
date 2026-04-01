# Stock Metrics Architecture Diagram

This document represents the actual architecture implemented in the project.

## 1. Overall System Architecture

```mermaid
flowchart TB
  subgraph Browser["Browser / Client Runtime"]
    AppShell["App Shell<br/>layout.tsx + providers.tsx + navbar.tsx"]
    FeaturePages["Feature Pages<br/>Dashboard | Screener | Watchlist | Portfolio | Learning | Agentic | Auth"]
    UIComponents["Feature Components<br/>stock-detail-view | screener-workbench | portfolio-manager | learning-assistant | agentic-ai-workbench"]
    Hooks["Client Hooks<br/>useStockDetail | useSearchEntities | useLiveQuote | useFxUsdInr"]
    QueryCache["React Query Cache<br/>server-data state"]
    UIStores["Zustand Stores<br/>ui-store | auth-store"]
    BrowserPersistence["Browser Persistence<br/>IndexedDB + localStorage + sessionStorage"]
  end

  subgraph ClientServices["Client Domain Services"]
    Adapters["Data Adapters<br/>market | fundamentals | search | news | documents | fx"]
    ClientTTL["Client TTL Cache<br/>fetch-cache.ts"]
    AILayer["AI Layer<br/>heuristic-provider | optional ollama/openai-compatible"]
    AgenticEngine["Agentic Engine<br/>intent -> profile -> diagnostics -> scoring -> action plan"]
    AuthAdapters["Auth Adapter Layer<br/>local-auth | firebase-auth"]
    StorageRepos["Storage Repositories<br/>watchlists | portfolioTxns | notes | customScreens | kv"]
  end

  subgraph NextServer["Next.js Route Handlers / Server Boundary"]
    ApiSearch["/api/search/universal"]
    ApiQuote["/api/market/quote"]
    ApiHistory["/api/market/history"]
    ApiFund["/api/fundamentals/us"]
    ApiNews["/api/news"]
    ApiDocs["/api/documents"]
    ApiFx["/api/fx/usd-inr"]
    ServerTTL["Server TTL Cache<br/>server-cache.ts"]
  end

  subgraph Providers["Provider Integrations"]
    SearchProvider["Universal Search Provider"]
    YahooProvider["Yahoo Provider"]
    SECProvider["SEC Provider"]
    RSSProvider["RSS Provider"]
    IndiaDocsProvider["India Documents Provider"]
    MFProvider["MFAPI Provider"]
    DemoData["Demo / Mock Data"]
  end

  subgraph ExternalSystems["External Systems"]
    Nasdaq["Nasdaq Symbol Directories"]
    NSE["NSE Equity List"]
    MFAPI["MFAPI / AMFI"]
    Yahoo["Yahoo Finance"]
    SEC["SEC EDGAR / XBRL"]
    GoogleNews["Google News RSS"]
    ERAPI["Exchange Rate API"]
    Firebase["Firebase Authentication"]
  end

  AppShell --> FeaturePages
  FeaturePages --> UIComponents
  UIComponents --> Hooks
  UIComponents --> UIStores
  UIStores --> BrowserPersistence
  Hooks --> QueryCache
  QueryCache --> Adapters
  Adapters --> ClientTTL
  ClientTTL --> ApiSearch
  ClientTTL --> ApiQuote
  ClientTTL --> ApiHistory
  ClientTTL --> ApiFund
  ClientTTL --> ApiNews
  ClientTTL --> ApiDocs
  ClientTTL --> ApiFx

  UIComponents --> AgenticEngine
  AgenticEngine --> AILayer
  AgenticEngine --> DemoData
  UIComponents --> AuthAdapters
  AuthAdapters --> BrowserPersistence
  AuthAdapters --> Firebase
  StorageRepos --> BrowserPersistence
  UIComponents --> StorageRepos

  ApiSearch --> ServerTTL
  ApiQuote --> ServerTTL
  ApiHistory --> ServerTTL
  ApiFund --> ServerTTL
  ApiNews --> ServerTTL
  ApiDocs --> ServerTTL
  ApiFx --> ServerTTL

  ServerTTL --> SearchProvider
  ServerTTL --> YahooProvider
  ServerTTL --> SECProvider
  ServerTTL --> RSSProvider
  ServerTTL --> IndiaDocsProvider
  ServerTTL --> MFProvider

  SearchProvider --> Nasdaq
  SearchProvider --> NSE
  SearchProvider --> MFAPI
  YahooProvider --> Yahoo
  SECProvider --> SEC
  RSSProvider --> GoogleNews
  ApiFx --> ERAPI
  MFProvider --> MFAPI
```

## 2. Stock Detail Data Flow

```mermaid
flowchart LR
  User["User opens stock page"] --> StockPage["/dashboard/[market]/[symbol]"]
  StockPage --> Hook["useStockDetail(symbol)"]
  Hook --> AdapterEntry["getStockDetail()"]

  AdapterEntry --> SearchResolve["Resolve entity via search adapter"]
  AdapterEntry --> QuoteReq["marketAdapter.getQuote()"]
  AdapterEntry --> HistoryReq["marketAdapter.getHistory()"]
  AdapterEntry --> FundReq["fundamentalsAdapter.getFundamentals()"]
  AdapterEntry --> NewsReq["newsAdapter.getNews()"]
  AdapterEntry --> DocsReq["documentsAdapter.getDocuments()"]

  SearchResolve --> ApiSearch["/api/search/universal"]
  QuoteReq --> ApiQuote["/api/market/quote"]
  HistoryReq --> ApiHistory["/api/market/history"]
  FundReq --> ApiFund["/api/fundamentals/us"]
  NewsReq --> ApiNews["/api/news"]
  DocsReq --> ApiDocs["/api/documents"]

  ApiSearch --> SearchProvider["Universal Search Provider"]
  ApiQuote --> YahooOrMF["Yahoo Provider or MFAPI Provider"]
  ApiHistory --> YahooHist["Yahoo History or MFAPI History"]
  ApiFund --> SECProvider["SEC Fundamentals Provider"]
  ApiNews --> RSSProvider["RSS News Provider"]
  ApiDocs --> DocsProvider["SEC Docs or India Docs Provider"]

  SearchProvider --> SearchSources["Nasdaq / NSE / MF indexes"]
  YahooOrMF --> MarketSources["Yahoo Finance / MFAPI"]
  YahooHist --> MarketSources
  SECProvider --> SECSources["SEC EDGAR / XBRL"]
  RSSProvider --> RSSSources["Google News RSS"]
  DocsProvider --> DocSources["SEC filings / company IR docs"]

  SearchResolve --> Bundle["StockDetailBundle"]
  QuoteReq --> Bundle
  HistoryReq --> Bundle
  FundReq --> Bundle
  NewsReq --> Bundle
  DocsReq --> Bundle

  Bundle --> Render["Render stock detail UI<br/>about | metrics | statements | chart | peer comparison | news | docs | notes"]
```

## 3. Agentic AI Architecture

```mermaid
flowchart TD
  UserInput["User Goal + Profile Inputs + Optional Preferred Stock"] --> Workbench["Agentic AI Workbench UI"]
  PortfolioData["IndexedDB Portfolio Transactions"] --> Workbench
  Workbench --> Run["generateAgenticAnalysis()"]

  Run --> Intent["1. Detect Intent<br/>long-term | valuation | technical | portfolio-review ..."]
  Run --> Profile["2. Infer Dynamic Investor Profile<br/>risk | horizon | capital | market | style"]
  Run --> Portfolio["3. Build Portfolio Diagnostics<br/>diversification | concentration | exposure | pnl"]
  Run --> Universe["4. Filter Stock Universe<br/>constraints + market preference"]

  Universe --> Analyze["5. Analyze Each Stock"]
  Analyze --> Metrics["Fundamental Metrics<br/>PE | PB | ROE | ROCE | debt | growth"]
  Analyze --> Statements["Statement Trends<br/>revenue | profit | CAGR"]
  Analyze --> Risk["Risk + Technical Context<br/>volatility | drawdown | trend phase"]
  Analyze --> Sentiment["Heuristic Sentiment + News Signals"]
  Analyze --> DCF["Simplified DCF Engine<br/>growth | discount | terminal value"]
  Analyze --> Peer["Peer Comparison"]
  Analyze --> PersonalFit["Profile Fit Adjustment"]

  Metrics --> Score["6. Suitability Scoring Engine"]
  Statements --> Score
  Risk --> Score
  Sentiment --> Score
  DCF --> Score
  Peer --> Score
  PersonalFit --> Score

  Score --> Recommendation["7. Recommendation Output<br/>BUY / HOLD / SELL<br/>probability split + confidence"]
  Recommendation --> ActionPanel["8. Action Panel<br/>allocation | entry range | backup actions"]
  Recommendation --> PortfolioFix["9. Portfolio Fix Suggestions"]
  Recommendation --> DataQuality["10. Data Quality Summary"]
  Recommendation --> Snapshot["11. Save last-run snapshot to IndexedDB KV"]
  Recommendation --> Watchlist["12. Optional auto-watchlist creation"]

  HeuristicAI["Heuristic AI Provider"] --> Analyze
  DemoInputs["Demo Universe + Demo Fundamentals + Demo History + Demo News"] --> Analyze

  ActionPanel --> Tabs["Workbench Tabs<br/>Summary | Portfolio | Recommendations | Deep Analysis"]
  PortfolioFix --> Tabs
  DataQuality --> Tabs
  Snapshot --> Tabs
  Watchlist --> Tabs
```

## 4. Storage Architecture

```mermaid
flowchart TB
  subgraph BrowserStorage["Browser-side Storage"]
    IndexedDB["IndexedDB via idb"]
    LocalState["localStorage via Zustand persist"]
    SessionState["sessionStorage for temporary local auth session"]
    MemoryClient["In-memory client fetch cache"]
  end

  subgraph IndexedDBObjectStores["IndexedDB Object Stores"]
    Users["users"]
    Session["session"]
    Watchlists["watchlists"]
    PortfolioTxns["portfolioTxns"]
    Notes["notes"]
    CustomScreens["customScreens"]
    KV["kv"]
  end

  IndexedDB --> Users
  IndexedDB --> Session
  IndexedDB --> Watchlists
  IndexedDB --> PortfolioTxns
  IndexedDB --> Notes
  IndexedDB --> CustomScreens
  IndexedDB --> KV
```

## 5. Key Architectural Characteristics

- `Modular`: UI does not call provider APIs directly; adapters isolate data-source complexity.
- `Local-first`: user-owned data is persisted in the browser, not a remote database.
- `Static-first + route-based backend`: most backend logic is implemented through lightweight Next.js route handlers.
- `Explainable AI`: Agentic AI is workflow-based and scoring-based, not only prompt-based.
- `Extensible`: provider interfaces allow future replacement or expansion of data sources and auth backends.

