'use client';

import { DashboardMarketTabs } from '@/components/dashboard/dashboard-market-tabs';
import { StockDetailView } from '@/components/dashboard/stock-detail-view';
import { UniversalSearch } from '@/components/search/universal-search';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { useStockDetail } from '@/lib/hooks/use-stock-data';

export default function StockDetailPage({ params }: { params: { market: string; symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const { data, isLoading, error, refetch, isFetching } = useStockDetail(symbol);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="space-y-3">
          <UniversalSearch />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard Market Switch</div>
            <DashboardMarketTabs />
          </div>
        </div>
      </section>

      {isLoading ? <div className="h-[320px] animate-pulse rounded-2xl border border-border bg-card" /> : null}

      {error ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Unable to load stock details</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{(error as Error).message}</p>
          <button onClick={() => refetch()} disabled={isFetching} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm text-white">
            {isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <ErrorBoundary>
          <StockDetailView bundle={data} />
        </ErrorBoundary>
      ) : null}
    </div>
  );
}
