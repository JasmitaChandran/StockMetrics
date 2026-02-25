'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { UniversalSearch } from '@/components/search/universal-search';

type MarketTab = 'us' | 'india' | 'mf';

type TopPick = {
  symbol: string;
  name: string;
  market: MarketTab;
  exchange?: string;
  caption?: string;
};

const TOP_PICKS: Record<MarketTab, TopPick[]> = {
  us: [
    { symbol: 'AAPL', name: 'Apple Inc.', market: 'us', exchange: 'NASDAQ', caption: 'Consumer tech' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'us', exchange: 'NASDAQ', caption: 'Software & cloud' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'us', exchange: 'NASDAQ', caption: 'AI & semiconductors' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', market: 'us', exchange: 'NASDAQ', caption: 'E-commerce & cloud' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'us', exchange: 'NASDAQ', caption: 'Search & ads' },
    { symbol: 'META', name: 'Meta Platforms, Inc.', market: 'us', exchange: 'NASDAQ', caption: 'Digital platforms' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', market: 'us', exchange: 'NASDAQ', caption: 'EVs & energy' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', market: 'us', exchange: 'NYSE', caption: 'Banking' },
  ],
  india: [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', market: 'india', exchange: 'NSE', caption: 'Energy & retail' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd', market: 'india', exchange: 'NSE', caption: 'IT services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', market: 'india', exchange: 'NSE', caption: 'Private bank' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', market: 'india', exchange: 'NSE', caption: 'Private bank' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd', market: 'india', exchange: 'NSE', caption: 'IT services' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', market: 'india', exchange: 'NSE', caption: 'Banking' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd', market: 'india', exchange: 'NSE', caption: 'Engineering' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd', market: 'india', exchange: 'NSE', caption: 'Consumer goods' },
  ],
  mf: [
    { symbol: 'AMFI:122639', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth', market: 'mf', exchange: 'MF', caption: 'Flexi cap' },
    { symbol: 'AMFI:120716', name: 'UTI Nifty 50 Index Fund - Growth Option- Direct', market: 'mf', exchange: 'MF', caption: 'Index fund' },
    { symbol: 'AMFI:118955', name: 'HDFC Flexi Cap Fund - Growth Option - Direct Plan', market: 'mf', exchange: 'MF', caption: 'Flexi cap' },
    { symbol: 'AMFI:125354', name: 'Axis Small Cap Fund - Direct Plan - Growth', market: 'mf', exchange: 'MF', caption: 'Small cap' },
    { symbol: 'AMFI:120828', name: 'Quant Small Cap Fund - Growth Option - Direct Plan', market: 'mf', exchange: 'MF', caption: 'Small cap' },
    { symbol: 'AMFI:125497', name: 'SBI Small Cap Fund - Direct Plan - Growth', market: 'mf', exchange: 'MF', caption: 'Small cap' },
    { symbol: 'AMFI:118778', name: 'Nippon India Small Cap Fund - Direct Plan Growth Plan - Growth Option', market: 'mf', exchange: 'MF', caption: 'Small cap' },
    { symbol: 'AMFI:147794', name: 'Motilal Oswal Nifty 50 Index Fund - Direct plan - Growth', market: 'mf', exchange: 'MF', caption: 'Index fund' },
  ],
};

const COPY: Record<
  MarketTab,
  {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    topLabel: string;
  }
> = {
  us: {
    title: 'US Stocks',
    subtitle: 'Search and explore listed U.S. equities.',
    searchLabel: 'Search U.S. Stocks',
    searchPlaceholder: 'Search U.S. stocks (e.g., AAPL, TSLA, Microsoft)',
    topLabel: 'Top U.S. Stocks',
  },
  india: {
    title: 'Indian Stocks',
    subtitle: 'Search and explore Indian listed equities.',
    searchLabel: 'Search Indian Stocks',
    searchPlaceholder: 'Search Indian stocks (e.g., HDFCBANK, RELIANCE, TCS)',
    topLabel: 'Top Indian Stocks',
  },
  mf: {
    title: 'Mutual Funds',
    subtitle: 'Search and explore mutual fund schemes.',
    searchLabel: 'Search Mutual Funds',
    searchPlaceholder: 'Search mutual funds (e.g., Parag Parikh, UTI Nifty 50)',
    topLabel: 'Top Mutual Funds',
  },
};

export function MarketTabPanel({ market }: { market: MarketTab }) {
  const content = COPY[market];
  const picks = TOP_PICKS[market];

  return (
    <SectionCard title={content.title} subtitle={content.subtitle}>
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{content.searchLabel}</div>
          <UniversalSearch marketFilter={market} placeholder={content.searchPlaceholder} />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{content.topLabel}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {picks.map((item) => (
              <Link
                key={`${market}-${item.symbol}`}
                href={`/dashboard/${item.market}/${encodeURIComponent(item.symbol)}`}
                className="surface-hover ui-panel glass group rounded-xl p-3 shadow-panel"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {item.symbol} {item.exchange ? `• ${item.exchange}` : ''}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" />
                </div>
                {item.caption ? <div className="mt-2 text-xs text-slate-500">{item.caption}</div> : null}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
