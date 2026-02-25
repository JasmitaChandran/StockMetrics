import type { AiProvider } from '@/types';
import { heuristicAiProvider } from './heuristic-provider';

export function createOllamaProvider(baseUrl = process.env.OLLAMA_BASE_URL, model = process.env.OLLAMA_MODEL): AiProvider {
  const fallback = heuristicAiProvider;
  return {
    ...fallback,
    id: 'ollama',
    name: `Ollama (${model ?? 'model'})`,
    async answerLearningQuestion({ question, docs }) {
      if (!baseUrl || !model) return fallback.answerLearningQuestion({ question, docs });
      try {
        const prompt = `Answer using the notes below. If unsure say so.\n\nNotes:\n${docs.join('\n\n')}\n\nQuestion: ${question}`;
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream: false }),
        });
        if (!res.ok) throw new Error('ollama failed');
        const data = (await res.json()) as { response?: string };
        return { answer: data.response ?? '', sources: ['Ollama local'] };
      } catch {
        return fallback.answerLearningQuestion({ question, docs });
      }
    },
  };
}
