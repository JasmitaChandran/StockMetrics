import { NextRequest, NextResponse } from 'next/server';
import { chatWithOllama, normalizeOllamaChatMessages } from '@/lib/ai/ollama-chat';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = [
  'You are a sharp, general-purpose assistant inside the Stock Metrics app.',
  'Answer any topic directly and intelligently.',
  'Avoid vague filler, empty hedging, and generic motivational language.',
  'Prefer concrete explanations, steps, examples, or calculations when they help.',
  'If the user asks an ambiguous question, make the most reasonable assumption and say what you assumed.',
  'If you are unsure, say what is uncertain instead of inventing facts.',
  'For code, math, or reasoning problems, show the important steps clearly.',
].join(' ');

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { messages?: unknown };
    const messages = normalizeOllamaChatMessages(body.messages);

    if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
      return NextResponse.json({ error: 'A user question is required.' }, { status: 400 });
    }

    const response = await chatWithOllama({
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    });

    return NextResponse.json(
      {
        reply: response.content,
        model: response.model,
        status: response.status,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to get an answer from the local model.',
      },
      {
        status: 502,
      },
    );
  }
}
