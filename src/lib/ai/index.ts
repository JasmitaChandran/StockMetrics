import type { AiProvider } from '@/types';
import { createOllamaProvider } from './ollama-provider';
import { createOpenAiCompatibleProvider } from './openai-compatible-provider';
import { heuristicAiProvider } from './heuristic-provider';

export function getAiProvider(): AiProvider {
  const configured = (process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER || '').toLowerCase();
  if (configured === 'ollama') return createOllamaProvider();
  if (configured === 'openai-compatible') return createOpenAiCompatibleProvider();
  return heuristicAiProvider;
}

export { heuristicAiProvider } from './heuristic-provider';
