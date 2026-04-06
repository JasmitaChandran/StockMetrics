import { describe, expect, it, vi } from 'vitest';
import {
  chatWithOllama,
  chooseFallbackOllamaModel,
  getConfiguredOllamaModel,
  getOllamaApiBaseUrl,
  getOllamaStatus,
  normalizeOllamaChatMessages,
} from '@/lib/ai/ollama-chat';

describe('ollama chat helpers', () => {
  it('normalizes the Ollama API base URL', () => {
    expect(getOllamaApiBaseUrl('http://localhost:11434')).toBe('http://localhost:11434/api');
    expect(getOllamaApiBaseUrl('http://localhost:11434/api')).toBe('http://localhost:11434/api');
  });

  it('uses qwen3 as the default model when none is configured', () => {
    expect(getConfiguredOllamaModel('')).toBe('qwen3');
    expect(getConfiguredOllamaModel(undefined)).toBe('qwen3');
  });

  it('filters and trims chat history before sending it to Ollama', () => {
    expect(
      normalizeOllamaChatMessages([
        { role: 'system', content: 'ignore me' },
        { role: 'user', content: '  Hello  ' },
        { role: 'assistant', content: ' Hi there ' },
        { role: 'user', content: '' },
        { role: 'tool', content: 'ignore me too' },
      ]),
    ).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]);
  });

  it('prefers a non-embedding fallback model when possible', () => {
    expect(chooseFallbackOllamaModel(['nomic-embed-text', 'llama3.1:8b'])).toBe('llama3.1:8b');
    expect(chooseFallbackOllamaModel(['nomic-embed-text'])).toBe('nomic-embed-text');
  });

  it('reports installed status and chooses a usable fallback model when no explicit model is set', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'nomic-embed-text' },
          { name: 'llama3.1:8b', size: 4_600_000_000, details: { parameter_size: '8B', quantization_level: 'Q4_K_M' } },
        ],
      }),
    } as Response);

    const originalModel = process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_MODEL;

    try {
      const status = await getOllamaStatus(fetchMock);
      expect(status.available).toBe(true);
      expect(status.configuredModel).toBe('qwen3');
      expect(status.activeModel).toBe('llama3.1:8b');
      expect(status.usingFallbackModel).toBe(true);
      expect(status.modelInstalled).toBe(true);
    } finally {
      if (typeof originalModel === 'string') {
        process.env.OLLAMA_MODEL = originalModel;
      } else {
        delete process.env.OLLAMA_MODEL;
      }
    }
  });

  it('throws a helpful error when Ollama is unreachable', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(
      chatWithOllama(
        {
          messages: [{ role: 'system', content: 'Test' }, { role: 'user', content: 'Hello' }],
        },
        fetchMock,
      ),
    ).rejects.toThrow('Ollama is not reachable');
  });
});
