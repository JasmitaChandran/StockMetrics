'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import {
  deleteAlertMessage,
  deleteAlertMessagesForUser,
  deletePriceAlert,
  getAlertContactSettings,
  listAlertMessages,
  listPriceAlerts,
  upsertPriceAlert,
} from '@/lib/storage/repositories';
import type { AlertMessageRecord, PriceAlertRecord } from '@/lib/storage/idb';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useSearchEntities } from '@/lib/hooks/use-stock-data';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { isValidWhatsAppPhone, toE164Phone } from '@/lib/utils/whatsapp';
import { useAuthStore } from '@/stores/auth-store';
import type { SearchEntity } from '@/types';

const MESSAGE_REFRESH_MS = 20_000;

function conditionText(alert: PriceAlertRecord) {
  return alert.direction === 'above'
    ? `Above ${formatNumber(alert.targetPrice, 2)}`
    : `Below ${formatNumber(alert.targetPrice, 2)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveAlertNotificationEmail(alert: PriceAlertRecord, fallbackEmail?: string | null) {
  return alert.notifyEmailTo?.trim() || fallbackEmail?.trim() || '';
}

function resolveAlertNotificationPhone(alert: PriceAlertRecord, fallbackPhone?: string | null) {
  return toE164Phone(alert.notifyWhatsAppTo?.trim() || fallbackPhone?.trim() || '');
}

export function AlertsWorkbench() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const userId = user?.id;
  const userEmail = user?.email;

  const [alerts, setAlerts] = useState<PriceAlertRecord[]>([]);
  const [messages, setMessages] = useState<AlertMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [clearingMessages, setClearingMessages] = useState(false);

  const [symbol, setSymbol] = useState('AAPL');
  const [selectedSymbolSuggestion, setSelectedSymbolSuggestion] = useState<SearchEntity | null>(null);
  const [isSymbolSuggestionsOpen, setIsSymbolSuggestionsOpen] = useState(false);
  const [activeSymbolSuggestionIndex, setActiveSymbolSuggestionIndex] = useState(0);
  const [market, setMarket] = useState<'us' | 'india' | 'mf'>('us');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyEmailTo, setNotifyEmailTo] = useState('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [notifyWhatsAppTo, setNotifyWhatsAppTo] = useState('');
  const [accountWhatsappVerified, setAccountWhatsappVerified] = useState(false);
  const symbolInputRootRef = useRef<HTMLDivElement>(null);
  const debouncedSymbolQuery = useDebouncedValue(symbol, 250);
  const { data: symbolSearchData, isLoading: isSymbolSearching } = useSearchEntities(debouncedSymbolQuery);
  const symbolSuggestions = useMemo(() => symbolSearchData ?? [], [symbolSearchData]);
  const visibleSymbolSuggestions = useMemo(() => symbolSuggestions.slice(0, 8), [symbolSuggestions]);
  const hasSymbolQuery = symbol.trim().length > 0;
  const showSymbolSuggestions = isSymbolSuggestionsOpen && hasSymbolQuery;

  async function refreshData() {
    if (!user) {
      setAlerts([]);
      setMessages([]);
      setLoading(false);
      return;
    }

    const [alertRows, messageRows] = await Promise.all([
      listPriceAlerts(user.id),
      listAlertMessages(user.id, 150),
    ]);
    setAlerts(alertRows);
    setMessages(messageRows);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    void refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(() => {
      void refreshData();
    }, MESSAGE_REFRESH_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setNotifyEmailTo('');
      setNotifyWhatsAppTo('');
      setAccountWhatsappVerified(false);
      return;
    }
    setNotifyEmailTo(userEmail?.trim() ?? '');
    void (async () => {
      const settings = await getAlertContactSettings({ userId });
      if (!active) return;
      setNotifyWhatsAppTo(toE164Phone(settings.whatsappPhone ?? ''));
      setAccountWhatsappVerified(Boolean(settings.whatsappVerified && settings.whatsappPhone));
    })();

    return () => {
      active = false;
    };
  }, [userId, userEmail]);

  const enabledCount = useMemo(
    () => alerts.filter((alert) => alert.enabled).length,
    [alerts],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!symbolInputRootRef.current || !target) return;
      if (!symbolInputRootRef.current.contains(target)) {
        setIsSymbolSuggestionsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsSymbolSuggestionsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!showSymbolSuggestions) {
      setActiveSymbolSuggestionIndex(0);
      return;
    }
    if (visibleSymbolSuggestions.length === 0) {
      setActiveSymbolSuggestionIndex(0);
      return;
    }
    setActiveSymbolSuggestionIndex((previous) => Math.min(previous, visibleSymbolSuggestions.length - 1));
  }, [showSymbolSuggestions, visibleSymbolSuggestions]);

  function pickSymbolSuggestion(entity: SearchEntity) {
    setSymbol(entity.displaySymbol);
    setSelectedSymbolSuggestion(entity);
    setMarket(entity.market);
    setIsSymbolSuggestionsOpen(false);
    setActiveSymbolSuggestionIndex(0);
    setError(null);
  }

  function autocompleteFromTopSymbolSuggestion() {
    if (!visibleSymbolSuggestions.length) return;
    pickSymbolSuggestion(visibleSymbolSuggestions[0]);
  }

  function clearSymbolQuery() {
    setSymbol('');
    setSelectedSymbolSuggestion(null);
    setIsSymbolSuggestionsOpen(false);
    setActiveSymbolSuggestionIndex(0);
    setError(null);
  }

  async function createAlert(preferredMatch?: SearchEntity) {
    if (!user) return;
    const query = symbol.trim();
    const normalizedSymbol = query.toUpperCase();
    const exactSuggestion = symbolSuggestions.find(
      (entity) => entity.symbol.toUpperCase() === normalizedSymbol || entity.displaySymbol.toUpperCase() === normalizedSymbol,
    );
    const match =
      preferredMatch ??
      selectedSymbolSuggestion ??
      exactSuggestion ??
      symbolSuggestions[0];
    const finalSymbol = match?.symbol ?? normalizedSymbol;
    const finalMarket = (match?.market ?? market) as 'us' | 'india' | 'mf';
    const target = Number(targetPrice);
    const customNotificationEmail = notifyEmailTo.trim();
    const notificationEmail = customNotificationEmail || user.email?.trim() || '';
    const notificationPhone = toE164Phone(notifyWhatsAppTo);

    if (!query) {
      setError('Please enter a stock symbol.');
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      setError('Please enter a valid target price above zero.');
      return;
    }

    if (notifyEmail && !isValidEmail(notificationEmail)) {
      setError('Please enter a valid notification email for this alert.');
      return;
    }

    if (notifyWhatsApp && !isValidWhatsAppPhone(notificationPhone)) {
      setError('Please enter a valid WhatsApp number in international format (example: +14155552671).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const nextAlert: PriceAlertRecord = {
        id: crypto.randomUUID(),
        userId: user.id,
        symbol: finalSymbol,
        market: finalMarket,
        direction,
        targetPrice: target,
        enabled: true,
        notifyEmail,
        notifyEmailTo: notificationEmail || undefined,
        notifyWhatsApp,
        notifyWhatsAppTo: notificationPhone || undefined,
        createdAt: now,
        updatedAt: now,
        lastConditionMet: false,
      };
      await upsertPriceAlert(nextAlert);
      setTargetPrice('');
      setSymbol(match?.displaySymbol ?? finalSymbol);
      setSelectedSymbolSuggestion(match ?? null);
      setIsSymbolSuggestionsOpen(false);
      await refreshData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create alert.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAlertEnabled(alert: PriceAlertRecord) {
    const now = new Date().toISOString();
    await upsertPriceAlert({
      ...alert,
      enabled: !alert.enabled,
      updatedAt: now,
      lastConditionMet: alert.enabled ? false : alert.lastConditionMet,
    });
    await refreshData();
  }

  async function removeAlert(id: string) {
    await deletePriceAlert(id);
    await refreshData();
  }

  async function changeAlertNotificationEmail(alert: PriceAlertRecord) {
    const currentEmail = resolveAlertNotificationEmail(alert, user?.email);
    const nextValue = window.prompt('Enter notification email for this alert.', currentEmail);
    if (nextValue === null) return;

    const nextEmail = nextValue.trim();
    if (!isValidEmail(nextEmail)) {
      setError('Please enter a valid email address to save notification settings.');
      return;
    }

    setError(null);
    await upsertPriceAlert({
      ...alert,
      notifyEmailTo: nextEmail,
      updatedAt: new Date().toISOString(),
    });
    await refreshData();
  }

  async function changeAlertNotificationPhone(alert: PriceAlertRecord) {
    const currentPhone = resolveAlertNotificationPhone(alert, notifyWhatsAppTo);
    const nextValue = window.prompt(
      'Enter WhatsApp number for this alert in international format (example: +14155552671).',
      currentPhone,
    );
    if (nextValue === null) return;

    const nextPhone = toE164Phone(nextValue);
    if (!isValidWhatsAppPhone(nextPhone)) {
      setError('Please enter a valid WhatsApp number in international format.');
      return;
    }

    setError(null);
    await upsertPriceAlert({
      ...alert,
      notifyWhatsApp: true,
      notifyWhatsAppTo: nextPhone,
      updatedAt: new Date().toISOString(),
    });
    await refreshData();
  }

  async function removeMessage(id: string) {
    setDeletingMessageId(id);
    setMessageError(null);
    try {
      await deleteAlertMessage(id);
      await refreshData();
    } catch (e) {
      setMessageError(e instanceof Error ? e.message : 'Unable to delete message.');
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function clearMessages() {
    if (!user) return;
    setClearingMessages(true);
    setMessageError(null);
    try {
      await deleteAlertMessagesForUser(user.id);
      await refreshData();
    } catch (e) {
      setMessageError(e instanceof Error ? e.message : 'Unable to clear messages.');
    } finally {
      setClearingMessages(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="grid gap-6">
        <SectionCard title="Alert" subtitle="Loading your alerts...">
          <div className="h-56 animate-pulse rounded-2xl border border-border bg-card/40" />
        </SectionCard>
      </div>
    );
  }

  if (!user) {
    return (
      <SectionCard
        title="Alert"
        subtitle="Sign in to create stock alerts and receive notifications."
      >
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-slate-500 dark:text-slate-400">
          You need to login first. Once signed in, alerts can notify you in-app, by email, and on WhatsApp.
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
      <SectionCard
        title="Alert"
        subtitle="Set stock price limits. Alerts are checked automatically in the background."
        action={
          <button
            type="button"
            onClick={() => void refreshData()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-muted/55 dark:text-slate-300"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                New Price Alert
              </div>
              <div className="rounded-full border border-border px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
                Active: {enabledCount}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Symbol
                </label>
                <div ref={symbolInputRootRef} className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={symbol}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSymbol(value);
                      setSelectedSymbolSuggestion(null);
                      setError(null);
                      setActiveSymbolSuggestionIndex(0);
                      setIsSymbolSuggestionsOpen(value.trim().length > 0);
                    }}
                    onFocus={() => setIsSymbolSuggestionsOpen(symbol.trim().length > 0)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' && visibleSymbolSuggestions.length) {
                        event.preventDefault();
                        setIsSymbolSuggestionsOpen(true);
                        setActiveSymbolSuggestionIndex((previous) => (previous + 1) % visibleSymbolSuggestions.length);
                        return;
                      }
                      if (event.key === 'ArrowUp' && visibleSymbolSuggestions.length) {
                        event.preventDefault();
                        setIsSymbolSuggestionsOpen(true);
                        setActiveSymbolSuggestionIndex((previous) =>
                          previous === 0 ? visibleSymbolSuggestions.length - 1 : previous - 1,
                        );
                        return;
                      }
                      if (event.key === 'Tab' && hasSymbolQuery && visibleSymbolSuggestions.length) {
                        event.preventDefault();
                        autocompleteFromTopSymbolSuggestion();
                        return;
                      }
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (showSymbolSuggestions && visibleSymbolSuggestions.length) {
                          pickSymbolSuggestion(visibleSymbolSuggestions[activeSymbolSuggestionIndex] ?? visibleSymbolSuggestions[0]);
                          return;
                        }
                        void createAlert();
                      }
                    }}
                    placeholder="Search stock / mutual fund (e.g., AAPL, HDFCBANK)"
                    className="w-full rounded-xl border border-border/80 bg-card py-2 pl-10 pr-24 text-sm"
                  />
                  <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
                    <button
                      type="button"
                      onClick={clearSymbolQuery}
                      disabled={!hasSymbolQuery}
                      className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-muted/60 disabled:cursor-default disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={autocompleteFromTopSymbolSuggestion}
                      disabled={!hasSymbolQuery || !visibleSymbolSuggestions.length}
                      className="rounded-md border border-border/80 px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-muted/60 disabled:cursor-default disabled:opacity-50"
                      title="Autocomplete with top result"
                    >
                      Tab
                    </button>
                  </div>
                  {showSymbolSuggestions ? (
                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-panel">
                      <div className="max-h-80 overflow-auto p-2">
                        {isSymbolSearching ? <div className="p-3 text-sm text-slate-500">Searching...</div> : null}
                        {!isSymbolSearching && visibleSymbolSuggestions.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500">
                            No matches. Try ticker (e.g., AAPL, HDFCBANK) or company name.
                          </div>
                        ) : null}
                        {visibleSymbolSuggestions.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => pickSymbolSuggestion(item)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left text-sm transition hover:border-indigo-400/20 hover:bg-muted/50',
                              index === activeSymbolSuggestionIndex && 'border-indigo-400/30 bg-muted/65',
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900 dark:text-white">{item.name}</div>
                              <div className="text-xs text-slate-500">
                                {item.displaySymbol} • {item.market.toUpperCase()} {item.exchange ? `• ${item.exchange}` : ''}
                              </div>
                            </div>
                            <span className="rounded-lg border border-border/70 bg-muted/50 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              {item.type === 'mutual_fund' ? 'MF' : 'Stock'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Market
                </label>
                <select
                  value={market}
                  onChange={(event) =>
                    setMarket(event.target.value as 'us' | 'india' | 'mf')
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="us">US</option>
                  <option value="india">India</option>
                  <option value="mf">Mutual Fund</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Condition
                </label>
                <select
                  value={direction}
                  onChange={(event) =>
                    setDirection(event.target.value as 'above' | 'below')
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="above">Price goes above</option>
                  <option value="below">Price goes below</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Target Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetPrice}
                  onChange={(event) => setTargetPrice(event.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(event) => setNotifyEmail(event.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Send email notification
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyWhatsApp}
                    onChange={(event) => setNotifyWhatsApp(event.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Send WhatsApp notification
                </label>
              </div>

              <button
                type="button"
                onClick={() => void createAlert()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Add Alert
              </button>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Notification Email
              </label>
              <input
                type="email"
                value={notifyEmailTo}
                onChange={(event) => setNotifyEmailTo(event.target.value)}
                placeholder={user.email || 'you@example.com'}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={notifyWhatsAppTo}
                onChange={(event) => setNotifyWhatsAppTo(event.target.value)}
                placeholder="+14155552671"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </div>

            {error ? (
              <p className="mt-3 text-xs text-negative">{error}</p>
            ) : null}
            {notifyEmail && !notifyEmailTo.trim() && !user.email ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                No email found for this account. Add a notification email above to send alerts.
              </p>
            ) : null}
            {notifyWhatsApp && !accountWhatsappVerified ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                WhatsApp phone is not verified yet. Go to Account and verify your number with OTP.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            {alerts.length ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-2xl border p-4 transition',
                    alert.enabled
                      ? 'border-border bg-card/55'
                      : 'border-border/70 bg-card/25 opacity-75',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {alert.symbol}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {alert.market.toUpperCase()} • {conditionText(alert)}
                      </p>
                      {alert.notifyEmail ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Email: {resolveAlertNotificationEmail(alert, user.email) || 'Not set'}
                        </p>
                      ) : null}
                      {alert.notifyWhatsApp ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          WhatsApp: {resolveAlertNotificationPhone(alert, notifyWhatsAppTo) || 'Not set'}
                        </p>
                      ) : null}
                      {alert.lastTriggeredAt ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Last triggered: {formatDateTime(alert.lastTriggeredAt)} at{' '}
                          {formatNumber(alert.lastTriggeredPrice, 2)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleAlertEnabled(alert)}
                        className={cn(
                          'rounded-xl border px-3 py-1.5 text-xs font-medium',
                          alert.enabled
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'border-border text-slate-500 dark:text-slate-300',
                        )}
                      >
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      {alert.notifyEmail ? (
                        <button
                          type="button"
                          onClick={() => void changeAlertNotificationEmail(alert)}
                          className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-muted/40 dark:text-slate-300"
                        >
                          Change Email
                        </button>
                      ) : null}
                      {alert.notifyWhatsApp ? (
                        <button
                          type="button"
                          onClick={() => void changeAlertNotificationPhone(alert)}
                          className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-muted/40 dark:text-slate-300"
                        >
                          Change Phone
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeAlert(alert.id)}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-muted/40 hover:text-rose-500"
                      >
                        <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-slate-500 dark:text-slate-400">
                No alerts yet. Create one above and this tab will start tracking it automatically.
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Messages"
        subtitle="Triggered alerts are logged here with the same details sent by email and WhatsApp."
        action={
          messages.length ? (
            <button
              type="button"
              onClick={() => void clearMessages()}
              disabled={clearingMessages}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-muted/55 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300"
            >
              <Trash2 className="h-4 w-4" />
              {clearingMessages ? 'Clearing...' : 'Clear Messages'}
            </button>
          ) : undefined
        }
      >
        <div className="max-h-[760px] space-y-2 overflow-auto pr-1">
          {messageError ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              {messageError}
            </p>
          ) : null}
          {messages.length ? (
            messages.map((message) => (
              <div
                key={message.id}
                className="rounded-2xl border border-border bg-card/55 p-4 text-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <BellRing className="h-4 w-4 text-indigo-300" />
                    {message.symbol} alert
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(message.createdAt)}
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeMessage(message.id)}
                      disabled={deletingMessageId === message.id}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-muted/40 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300"
                    >
                      {deletingMessageId === message.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
                <p className="leading-6 text-slate-600 dark:text-slate-300">
                  {message.message}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {message.emailStatus === 'sent' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Email sent
                    </span>
                  ) : message.emailStatus === 'failed' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Email failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-slate-500 dark:text-slate-400">
                      Email skipped
                    </span>
                  )}
                  {message.emailError ? (
                    <span className="text-amber-400">{message.emailError}</span>
                  ) : null}
                  {(message.whatsappStatus ?? 'skipped') === 'sent' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      WhatsApp sent
                    </span>
                  ) : (message.whatsappStatus ?? 'skipped') === 'failed' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      WhatsApp failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-slate-500 dark:text-slate-400">
                      WhatsApp skipped
                    </span>
                  )}
                  {message.whatsappError ? (
                    <span className="text-amber-400">{message.whatsappError}</span>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-slate-500 dark:text-slate-400">
              No triggered alerts yet. Once a condition is met, the message will appear here.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
