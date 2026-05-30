import { NextRequest, NextResponse } from 'next/server';
import { isValidWhatsAppPhone, toE164Phone } from '@/lib/utils/whatsapp';

export const runtime = 'nodejs';

interface WhatsAppPayload {
  toPhone?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromPhone) {
    return NextResponse.json(
      {
        error:
          'WhatsApp alert is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.',
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as WhatsAppPayload;
  const toPhone = toE164Phone(body.toPhone?.trim() ?? '');
  const message = body.message?.trim() ?? '';

  if (!toPhone || !isValidWhatsAppPhone(toPhone)) {
    return NextResponse.json(
      { error: 'A valid WhatsApp recipient phone number (E.164) is required.' },
      { status: 400 },
    );
  }

  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  const params = new URLSearchParams({
    From: fromPhone.startsWith('whatsapp:') ? fromPhone : `whatsapp:${fromPhone}`,
    To: `whatsapp:${toPhone}`,
    Body: message,
  });

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as { sid?: unknown; message?: unknown } | null;
    const payloadSid = typeof payload?.sid === 'string' ? payload.sid : undefined;
    const payloadMessage = typeof payload?.message === 'string' ? payload.message : undefined;

    if (!response.ok) {
      return NextResponse.json(
        { error: payloadMessage ?? `Twilio request failed (${response.status}).` },
        { status: 502 },
      );
    }

    if (!payloadSid) {
      return NextResponse.json(
        { error: 'Twilio contract mismatch: successful response did not include message SID.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sid: payloadSid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to send WhatsApp message.' },
      { status: 502 },
    );
  }
}
