import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

interface AlertEmailPayload {
  toEmail?: string;
  subject?: string;
  message?: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const smtpUser = process.env.GMAIL_SMTP_USER;
  const smtpPass = process.env.GMAIL_SMTP_APP_PASSWORD;

  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      {
        error:
          'Email alert is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in environment variables.',
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as AlertEmailPayload;
  const toEmail = body.toEmail?.trim() ?? '';
  const subject = body.subject?.trim() ?? '';
  const message = body.message?.trim() ?? '';

  if (!toEmail || !isValidEmail(toEmail)) {
    return NextResponse.json({ error: 'A valid recipient email is required.' }, { status: 400 });
  }

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const fromName = process.env.GMAIL_FROM_NAME || 'Stock Metrics Alerts';
    await transporter.sendMail({
      from: `${fromName} <${smtpUser}>`,
      to: toEmail,
      subject,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send email alert.' },
      { status: 502 },
    );
  }
}
