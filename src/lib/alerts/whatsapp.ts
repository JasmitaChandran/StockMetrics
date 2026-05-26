import { toE164Phone } from '@/lib/utils/whatsapp';

type WhatsAppResult = { status: 'sent' | 'failed'; error?: string };

export async function notifyByWhatsApp(toPhone: string, message: string): Promise<WhatsAppResult> {
  try {
    const response = await fetch('/api/alerts/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toPhone: toE164Phone(toPhone),
        message,
      }),
    });

    if (response.ok) return { status: 'sent' };
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return {
      status: 'failed',
      error: payload.error ?? `WhatsApp request failed (${response.status}).`,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unable to reach WhatsApp endpoint.',
    };
  }
}

export function buildWelcomeWhatsAppMessage(displayName: string) {
  return [
    `Hi ${displayName}, welcome to Stock Metrics!`,
    'You are now successfully logged in.',
    'We are excited to help you track alerts and market moves.',
  ].join(' ');
}
