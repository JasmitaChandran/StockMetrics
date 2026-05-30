import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));

import { NextRequest } from 'next/server';
import { POST as postWhatsAppAlert } from '@/app/api/alerts/whatsapp/route';

const ORIGINAL_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const ORIGINAL_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const ORIGINAL_FROM_PHONE = process.env.TWILIO_WHATSAPP_FROM;
const ORIGINAL_FETCH = globalThis.fetch;

function restoreEnv() {
  if (ORIGINAL_ACCOUNT_SID === undefined) {
    delete process.env.TWILIO_ACCOUNT_SID;
  } else {
    process.env.TWILIO_ACCOUNT_SID = ORIGINAL_ACCOUNT_SID;
  }

  if (ORIGINAL_AUTH_TOKEN === undefined) {
    delete process.env.TWILIO_AUTH_TOKEN;
  } else {
    process.env.TWILIO_AUTH_TOKEN = ORIGINAL_AUTH_TOKEN;
  }

  if (ORIGINAL_FROM_PHONE === undefined) {
    delete process.env.TWILIO_WHATSAPP_FROM;
  } else {
    process.env.TWILIO_WHATSAPP_FROM = ORIGINAL_FROM_PHONE;
  }
}

function restoreFetch() {
  if (ORIGINAL_FETCH === undefined) {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  } else {
    globalThis.fetch = ORIGINAL_FETCH;
  }
}

function setTwilioEnv() {
  process.env.TWILIO_ACCOUNT_SID = 'AC123';
  process.env.TWILIO_AUTH_TOKEN = 'AUTH_TOKEN';
  process.env.TWILIO_WHATSAPP_FROM = '+14155552671';
}

describe('alerts whatsapp API route integration', () => {
  afterEach(() => {
    restoreEnv();
    restoreFetch();
    vi.clearAllMocks();
  });

  it('returns 503 when Twilio configuration is missing', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: '+14155552671', message: 'Price alert' }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        'WhatsApp alert is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.',
    });
  });

  it('returns 400 for invalid destination phone', async () => {
    setTwilioEnv();

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: '12345', message: 'Price alert' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'A valid WhatsApp recipient phone number (E.164) is required.',
    });
  });

  it('returns 400 when message is missing', async () => {
    setTwilioEnv();

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: '+14155552671', message: '   ' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Message is required.' });
  });

  it('sends Twilio request and returns sid for valid payloads', async () => {
    setTwilioEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ sid: 'SM123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: ' 919876543210 ', message: 'Target reached' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sid: 'SM123' });

    const [url, options] = fetchMock.mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('AC123:AUTH_TOKEN').toString('base64')}`);

    const params = new URLSearchParams(options.body);
    expect(params.get('From')).toBe('whatsapp:+14155552671');
    expect(params.get('To')).toBe('whatsapp:+919876543210');
    expect(params.get('Body')).toBe('Target reached');
  });

  it('returns 502 with Twilio error payload when Twilio rejects', async () => {
    setTwilioEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: 'Template not approved' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: '+919876543210', message: 'Target reached' }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Template not approved' });
  });

  it('returns 502 when Twilio network call throws', async () => {
    setTwilioEnv();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: '+919876543210', message: 'Target reached' }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Network down' });
  });
});
