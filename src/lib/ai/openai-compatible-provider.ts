import type { AiProvider } from '@/types';
import { heuristicAiProvider } from './heuristic-provider';

export function createOpenAiCompatibleProvider(): AiProvider {
  const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  const model = process.env.OPENAI_COMPATIBLE_MODEL;
  const fallback = heuristicAiProvider;

  return {
    ...fallback,
    id: 'openai-compatible',
    name: 'OpenAI-compatible',
    async answerLearningQuestion({ question, docs }) {
      if (!baseUrl || !apiKey || !model) return fallback.answerLearningQuestion({ question, docs });
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are a finance learning assistant. Answer conservatively and cite only from provided notes when possible.',
              },
              { role: 'user', content: `Notes:\n${docs.join('\n\n')}\n\nQuestion: ${question}` },
            ],
            temperature: 0.2,
          }),
        });
        if (!res.ok) throw new Error('openai-compatible failed');
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        return { answer: data.choices?.[0]?.message?.content ?? '', sources: ['OpenAI-compatible endpoint'] };
      } catch {
        return fallback.answerLearningQuestion({ question, docs });
      }
    },
  };
}
