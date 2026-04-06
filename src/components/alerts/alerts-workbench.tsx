'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import {
  deleteAlertMessage,
  deleteAlertMessagesForUser,
  deletePriceAlert,
  listAlertMessages,
  listPriceAlerts,
  upsertPriceAlert,
} from '@/lib/storage/repositories';
import type { AlertMessageRecord, PriceAlertRecord } from '@/lib/storage/idb';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/auth-store';

const MESSAGE_REFRESH_MS = 20_000;

function conditionText(alert: PriceAlertRecord) {
  return alert.direction === 'above'
    ? `Above ${formatNumber(alert.targetPrice, 2)}`
    : `Below ${formatNumber(alert.targetPrice, 2)}`;
}

export function AlertsWorkbench() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const [alerts, setAlerts] = useState<PriceAlertRecord[]>([]);
  const [messages, setMessages] = useState<AlertMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [clearingMessages, setClearingMessages] = useState(false);

  const [symbol, setSymbol] = useState('AAPL');
  const [market, setMarket] = useState<'us' | 'india' | 'mf'>('us');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);

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

  const enabledCount = useMemo(
    () => alerts.filter((alert) => alert.enabled).length,
    [alerts],
  );

  async function createAlert() {
    if (!user) return;
    const normalizedSymbol = symbol.trim().toUpperCase();
    const target = Number(targetPrice);

    if (!normalizedSymbol) {
      setError('Please enter a stock symbol.');
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      setError('Please enter a valid target price above zero.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const nextAlert: PriceAlertRecord = {
        id: crypto.randomUUID(),
        userId: user.id,
        symbol: normalizedSymbol,
        market,
        direction,
        targetPrice: target,
        enabled: true,
        notifyEmail,
        createdAt: now,
        updatedAt: now,
        lastConditionMet: false,
      };
      await upsertPriceAlert(nextAlert);
      setTargetPrice('');
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

  async function toggleAlertEmail(alert: PriceAlertRecord) {
    const now = new Date().toISOString();
    await upsertPriceAlert({
      ...alert,
      notifyEmail: !alert.notifyEmail,
      updatedAt: now,
    });
    await refreshData();
  }

  async function removeAlert(id: string) {
    await deletePriceAlert(id);
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
          You need to login first. Once signed in, alerts can notify you in-app and by email.
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
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="AAPL, TCS.NS, INFY.NS"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                />
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
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(event) => setNotifyEmail(event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Send email to {user.email || 'signed-in account'}
              </label>

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

            {error ? (
              <p className="mt-3 text-xs text-negative">{error}</p>
            ) : null}
            {!user.email ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                No email found for this account, so Gmail notification will fail until an email is available.
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
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-border text-slate-500 dark:text-slate-300',
                        )}
                      >
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleAlertEmail(alert)}
                        className={cn(
                          'rounded-xl border px-3 py-1.5 text-xs font-medium',
                          alert.notifyEmail
                            ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                            : 'border-border text-slate-500 dark:text-slate-300',
                        )}
                      >
                        <Mail className="mr-1 inline h-3.5 w-3.5" />
                        {alert.notifyEmail ? 'Email On' : 'Email Off'}
                      </button>
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
        subtitle="Triggered alerts are logged here with the same details sent by email."
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
                <div className="mt-3 inline-flex items-center gap-2 text-xs">
                  {message.emailStatus === 'sent' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Email sent
                    </span>
                  ) : message.emailStatus === 'failed' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-amber-300">
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
