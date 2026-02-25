'use client';

import { useMemo, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { getAiProvider } from '@/lib/ai';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
}

export function LearningAssistant({ docs }: { docs: Array<{ title: string; body: string }> }) {
  const [question, setQuestion] = useState('What is P/E ratio and how should a beginner use it?');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Ask any finance question. Answers are generated from the built-in learning library by default. You can also connect a local Ollama service or an OpenAI-compatible provider through environment settings.',
    },
  ]);
  const ai = useMemo(() => getAiProvider(), []);

  async function ask() {
    if (!question.trim()) return;
    const q = question.trim();
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    const res = await ai.answerLearningQuestion({ question: q, docs: docs.map((d) => `${d.title}\n${d.body}`) });
    setMessages((prev) => [...prev, { role: 'assistant', text: res.answer, sources: res.sources }]);
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
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} className="flex-1 rounded-xl border border-border bg-card p-3 text-sm" placeholder="Ask about ratios, statements, risk, diversification, valuation..." />
            <button onClick={ask} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white self-end">
              <Send className="h-4 w-4" /> Ask
            </button>
          </div>
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
