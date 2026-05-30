import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildWelcomeWhatsAppMessage, notifyByWhatsApp } from '@/lib/alerts/whatsapp';

describe('alerts whatsapp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sent when API responds with success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const result = await notifyByWhatsApp('919876543210', 'Price alert fired');

    expect(result).toEqual({ status: 'sent' });
    expect(fetchMock).toHaveBeenCalledWith('/api/alerts/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toPhone: '+919876543210',
        message: 'Price alert fired',
      }),
    });
  });

  it('returns API error details when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Invalid phone number' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await notifyByWhatsApp('+14155552671', 'Hello');

    expect(result).toEqual({ status: 'failed', error: 'Invalid phone number' });
  });

  it('returns a helpful message when the endpoint is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await notifyByWhatsApp('+14155552671', 'Hello');

    expect(result).toEqual({ status: 'failed', error: 'Network down' });
  });

  it('builds a friendly welcome message', () => {
    const message = buildWelcomeWhatsAppMessage('Asha');

    expect(message).toContain('Hi Asha');
    expect(message).toContain('welcome to Stock Metrics');
    expect(message).toContain('track alerts and market moves');
  });
});
