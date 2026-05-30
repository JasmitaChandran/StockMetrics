import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));

vi.mock('@/lib/ai/ollama-chat', () => ({
  getOllamaStatus: vi.fn(),
  chatWithOllama: vi.fn(),
  normalizeOllamaChatMessages: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getQaStatus } from '@/app/api/qa/status/route';
import { POST as postQaChat } from '@/app/api/qa/chat/route';
import { chatWithOllama, getOllamaStatus, normalizeOllamaChatMessages } from '@/lib/ai/ollama-chat';

describe('qa API route integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns local-model status response with no-store caching', async () => {
    vi.mocked(getOllamaStatus).mockResolvedValue({ installed: true, reachable: true, model: 'qwen3' });

    const response = await getQaStatus();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ installed: true, reachable: true, model: 'qwen3' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 400 when normalized messages are empty', async () => {
    vi.mocked(normalizeOllamaChatMessages).mockReturnValue([]);

    const response = await postQaChat(
      new NextRequest('http://localhost/api/qa/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A user question is required.' });
    expect(chatWithOllama).not.toHaveBeenCalled();
  });

  it('returns 400 when last normalized message is not from user', async () => {
    vi.mocked(normalizeOllamaChatMessages).mockReturnValue([{ role: 'assistant', content: 'Hi' }]);

    const response = await postQaChat(
      new NextRequest('http://localhost/api/qa/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'assistant', content: 'Hi' }] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A user question is required.' });
    expect(chatWithOllama).not.toHaveBeenCalled();
  });

  it('calls chat provider with a prepended system prompt and returns reply payload', async () => {
    vi.mocked(normalizeOllamaChatMessages).mockReturnValue([{ role: 'user', content: 'Explain CAGR' }]);
    vi.mocked(chatWithOllama).mockResolvedValue({
      content: 'CAGR is the compound annual growth rate.',
      model: 'qwen3:latest',
      status: 'ok',
    });

    const response = await postQaChat(
      new NextRequest('http://localhost/api/qa/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Explain CAGR' }] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reply: 'CAGR is the compound annual growth rate.',
      model: 'qwen3:latest',
      status: 'ok',
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const call = vi.mocked(chatWithOllama).mock.calls[0]?.[0];
    expect(call.messages[0]?.role).toBe('system');
    expect(call.messages[0]?.content).toContain('general-purpose assistant inside the Stock Metrics app');
    expect(call.messages[1]).toEqual({ role: 'user', content: 'Explain CAGR' });
  });

  it('returns 502 when chat provider throws', async () => {
    vi.mocked(normalizeOllamaChatMessages).mockReturnValue([{ role: 'user', content: 'hello' }]);
    vi.mocked(chatWithOllama).mockRejectedValue(new Error('Ollama is unreachable'));

    const response = await postQaChat(
      new NextRequest('http://localhost/api/qa/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Ollama is unreachable' });
  });
});
