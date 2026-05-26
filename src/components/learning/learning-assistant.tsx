'use client';

import { useMemo, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { getAiProvider } from '@/lib/ai';
import { cn } from '@/lib/utils/cn';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
}

export function LearningAssistant({ docs }: { docs: Array<{ title: string; body: string }> }) {
  const [question, setQuestion] = useState('What is P/E ratio and how should a beginner use it?');
  const [questionError, setQuestionError] = useState('');
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Ask any finance question. Answers are generated from the built-in learning library by default. You can also connect a local Ollama service or an OpenAI-compatible provider through environment settings.',
    },
  ]);
  const ai = useMemo(() => getAiProvider(), []);

  async function ask() {
    if (asking) return;
    if (!question.trim()) {
      setQuestionError('Question is required.');
      return;
    }
    setQuestionError('');
    const q = question.trim();
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setAsking(true);
    try {
      const res = await ai.answerLearningQuestion({ question: q, docs: docs.map((d) => `${d.title}\n${d.body}`) });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, sources: res.sources }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to answer right now.';
      setMessages((prev) => [...prev, { role: 'assistant', text: message }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <SectionCard title="AI Finance Learning" subtitle="Built-in learning library with automated responses. Optional Ollama and OpenAI-compatible providers are supported.">
        <div className="space-y-3">
          <div className="max-h-[500px] space-y-3 overflow-auto rounded-xl border border-border p-3">
            {messages.map((m, idx) => (
              <div key={`${m.role}-${idx}`} className={`rounded-xl p-3 text-sm ${m.role === 'assistant' ? 'border border-border bg-card' : 'bg-accent/10'}`}>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : null}
                  {m.role}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">{m.text}</p>
                {m.sources?.length ? <p className="mt-2 text-xs text-slate-500">Sources: {m.sources.join(', ')}</p> : null}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={(event) => {
                const value = event.target.value;
                setQuestion(value);
                if (questionError && value.trim()) setQuestionError('');
              }}
              rows={3}
              className={cn(
                'flex-1 rounded-xl border bg-card p-3 text-sm',
                questionError ? 'border-rose-400 focus:border-rose-500' : 'border-border',
              )}
              placeholder="Ask about ratios, statements, risk, diversification, valuation..."
            />
            <button
              onClick={ask}
              disabled={asking}
              className="inline-flex self-end items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> Ask
            </button>
          </div>
          {questionError ? <p className="text-xs text-rose-500">{questionError}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Learning Library" subtitle="Built-in reference articles covering core finance concepts and terminology.">
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.title} className="rounded-xl border border-border p-3">
              <div className="text-sm font-medium">{d.title}</div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-4">{d.body}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
