export type MarketKind = 'us' | 'india' | 'mf';

export type ExchangeCode = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ' | 'AMEX' | 'MF' | 'UNKNOWN';

export interface SearchEntity {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  market: MarketKind;
  exchange?: ExchangeCode;
  sector?: string;
  industry?: string;
  country?: string;
  website?: string;
  summary?: string;
  aliases?: string[];
  currency?: 'USD' | 'INR';
  type: 'stock' | 'mutual_fund';
}

export interface Quote {
  symbol: string;
  market: MarketKind;
  exchange?: ExchangeCode;
  currency: 'USD' | 'INR';
  price: number | null;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  timestamp?: string | null;
  source: string;
  delayed?: boolean;
}

export interface PricePoint {
  ts: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface HistorySeries {
  symbol: string;
  currency: 'USD' | 'INR';
  points: PricePoint[];
  source: string;
  delayed?: boolean;
}

export interface MarketStatusInfo {
  isOpen: boolean;
  marketLabel: string;
  timezone: string;
  localTime: string;
  nextOpenIst: string;
  sessionCloseIst: string;
  message: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet?: string;
  relevanceScore?: number;
  sentimentScore?: number;
}

export interface DocumentLink {
  id: string;
  title: string;
  url: string;
  kind: 'annual_report' | 'filing' | 'presentation' | 'other';
  year?: number;
  source: string;
}
