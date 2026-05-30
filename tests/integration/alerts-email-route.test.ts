import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

import nodemailer from 'nodemailer';
import { NextRequest } from 'next/server';
import { POST as postEmailAlert } from '@/app/api/alerts/email/route';

const ORIGINAL_SMTP_USER = process.env.GMAIL_SMTP_USER;
const ORIGINAL_SMTP_PASS = process.env.GMAIL_SMTP_APP_PASSWORD;
const ORIGINAL_FROM_NAME = process.env.GMAIL_FROM_NAME;

function restoreEnv() {
  if (ORIGINAL_SMTP_USER === undefined) {
    delete process.env.GMAIL_SMTP_USER;
  } else {
    process.env.GMAIL_SMTP_USER = ORIGINAL_SMTP_USER;
  }

  if (ORIGINAL_SMTP_PASS === undefined) {
    delete process.env.GMAIL_SMTP_APP_PASSWORD;
  } else {
    process.env.GMAIL_SMTP_APP_PASSWORD = ORIGINAL_SMTP_PASS;
  }

  if (ORIGINAL_FROM_NAME === undefined) {
    delete process.env.GMAIL_FROM_NAME;
  } else {
    process.env.GMAIL_FROM_NAME = ORIGINAL_FROM_NAME;
  }
}

function setEmailEnv() {
  process.env.GMAIL_SMTP_USER = 'alerts@example.com';
  process.env.GMAIL_SMTP_APP_PASSWORD = 'app-password';
}

describe('alerts email API route integration', () => {
  afterEach(() => {
    restoreEnv();
    vi.clearAllMocks();
  });

  it('returns 503 when SMTP configuration is missing', async () => {
    delete process.env.GMAIL_SMTP_USER;
    delete process.env.GMAIL_SMTP_APP_PASSWORD;

    const response = await postEmailAlert(
      new NextRequest('http://localhost/api/alerts/email', {
        body: JSON.stringify({
          toEmail: 'user@example.com',
          subject: 'Price alert',
          message: 'AAPL crossed target',
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        'Email alert is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in environment variables.',
    });
  });

  it('returns 400 for invalid recipient email and does not send', async () => {
    setEmailEnv();

    const response = await postEmailAlert(
      new NextRequest('http://localhost/api/alerts/email', {
        body: JSON.stringify({
          toEmail: 'not-an-email',
          subject: 'Price alert',
          message: 'AAPL crossed target',
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid recipient email is required.' });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('treats malformed JSON payload as invalid request body', async () => {
    setEmailEnv();

    const response = await postEmailAlert(
      new NextRequest('http://localhost/api/alerts/email', {
        body: '{"toEmail":',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid recipient email is required.' });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('returns 400 when subject or message is missing', async () => {
    setEmailEnv();

    const response = await postEmailAlert(
      new NextRequest('http://localhost/api/alerts/email', {
        body: JSON.stringify({
          toEmail: 'user@example.com',
          subject: '',
          message: '   ',
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Subject and message are required.' });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('sends email successfully with expected transporter payload', async () => {
    setEmailEnv();
    process.env.GMAIL_FROM_NAME = 'Alerts Bot';

    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    const response = await postEmailAlert(
      new NextRequest('http://localhost/api/alerts/email', {
        body: JSON.stringify({
          toEmail: '  user@example.com ',
          subject: '  Price Alert  ',
          message: 'Price crossed\nPlease check.',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: 'alerts@example.com',
        pass: 'app-password',
      },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Alerts Bot <alerts@example.com>',
      to: 'user@example.com',
      subject: 'Price Alert',
      text: 'Price crossed\nPlease check.',
      html: '<p>Price crossed<br/>Please check.</p>',
    });
  });

  it('returns 502 when transporter sendMail throws', async () => {
    setEmailEnv();

    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP unavailable'));
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    const response = await postEmailAlert(
      new NextRequest('http://localhost/api/alerts/email', {
        body: JSON.stringify({
          toEmail: 'user@example.com',
          subject: 'Price alert',
          message: 'AAPL crossed target',
        }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'SMTP unavailable' });
  });
});
