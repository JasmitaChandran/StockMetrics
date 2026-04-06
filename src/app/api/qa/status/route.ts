import { NextResponse } from 'next/server';
import { getOllamaStatus } from '@/lib/ai/ollama-chat';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getOllamaStatus();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
