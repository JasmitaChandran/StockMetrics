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

describe('Twilio contract guard', () => {
  afterEach(() => {
    restoreEnv();
    restoreFetch();
    vi.clearAllMocks();
  });

  it('returns 502 when Twilio success payload does not include sid', async () => {
    setTwilioEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'queued' }),
      }),
    );

    const response = await postWhatsAppAlert(
      new NextRequest('http://localhost/api/alerts/whatsapp', {
        body: JSON.stringify({ toPhone: '+919876543210', message: 'Target reached' }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Twilio contract mismatch: successful response did not include message SID.',
    });
  });
});
