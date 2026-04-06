'use client';

import { useEffect, useRef } from 'react';
import { buildAlertMessage, evaluatePriceAlert } from '@/lib/alerts/logic';
import {
  addAlertMessage,
  listPriceAlerts,
  upsertPriceAlert,
} from '@/lib/storage/repositories';
import type { Quote } from '@/types';
import { useAuthStore } from '@/stores/auth-store';

const ALERT_POLL_INTERVAL_MS = 45_000;

async function fetchLatestQuote(symbol: string, market: 'us' | 'india' | 'mf') {
  const response = await fetch(
    `/api/market/quote?symbol=${encodeURIComponent(symbol)}&market=${market}`,
    {
      cache: 'no-store',
    },
  );
  if (!response.ok) return undefined;
  return (await response.json()) as Quote;
}

async function notifyByEmail(
  toEmail: string,
  subject: string,
  message: string,
): Promise<{ status: 'sent' | 'failed'; error?: string }> {
  try {
    const response = await fetch('/api/alerts/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toEmail, subject, message }),
    });
    if (response.ok) return { status: 'sent' };
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return { status: 'failed', error: payload.error ?? `Email request failed (${response.status}).` };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unable to reach email endpoint.',
    };
  }
}

export function AlertBackgroundMonitor() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (loading || !user) return;
    const currentUser = user;

    let active = true;

    async function runAlertChecks() {
      if (!active || checkingRef.current) return;
      checkingRef.current = true;

      try {
        const alerts = await listPriceAlerts(currentUser.id);
        const enabledAlerts = alerts.filter((alert) => alert.enabled);
        if (!enabledAlerts.length) return;

        for (const alert of enabledAlerts) {
          if (!active) break;

          const quote = await fetchLatestQuote(alert.symbol, alert.market);
          if (typeof quote?.price !== 'number' || Number.isNaN(quote.price)) continue;

          const evaluation = evaluatePriceAlert({
            symbol: alert.symbol,
            market: alert.market,
            direction: alert.direction,
            targetPrice: alert.targetPrice,
            latestPrice: quote.price,
            lastConditionMet: alert.lastConditionMet,
          });

          if (!evaluation.shouldTrigger) {
            if (alert.lastConditionMet !== evaluation.isConditionMet) {
              await upsertPriceAlert({
                ...alert,
                lastConditionMet: evaluation.isConditionMet,
                updatedAt: new Date().toISOString(),
              });
            }
            continue;
          }

          const triggeredAt = new Date().toISOString();
          const alertContent = buildAlertMessage({
            symbol: alert.symbol,
            market: alert.market,
            direction: alert.direction,
            targetPrice: alert.targetPrice,
            latestPrice: quote.price,
            triggeredAt,
          });

          let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
          let emailError: string | undefined;

          if (alert.notifyEmail) {
            if (currentUser.email) {
              const email = await notifyByEmail(
                currentUser.email,
                alertContent.subject,
                alertContent.body,
              );
              emailStatus = email.status;
              emailError = email.error;
            } else {
              emailStatus = 'failed';
              emailError = 'No signed-in email found for this account.';
            }
          }

          await addAlertMessage({
            id: crypto.randomUUID(),
            userId: currentUser.id,
            alertId: alert.id,
            symbol: alert.symbol,
            market: alert.market,
            direction: alert.direction,
            targetPrice: alert.targetPrice,
            triggeredPrice: quote.price,
            createdAt: triggeredAt,
            message: alertContent.body,
            emailStatus,
            emailError,
          });

          await upsertPriceAlert({
            ...alert,
            lastConditionMet: true,
            lastTriggeredAt: triggeredAt,
            lastTriggeredPrice: quote.price,
            updatedAt: triggeredAt,
          });
        }
      } finally {
        checkingRef.current = false;
      }
    }

    void runAlertChecks();
    const intervalId = window.setInterval(() => {
      void runAlertChecks();
    }, ALERT_POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [loading, user]);

  return null;
}
