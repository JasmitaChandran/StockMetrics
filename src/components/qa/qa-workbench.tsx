'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, Send, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { parseChatContent, type ChatInlineSegment } from '@/lib/qa/chat-format';
import { getKv, setKv } from '@/lib/storage/repositories';
import { cn } from '@/lib/utils/cn';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  error?: boolean;
}

interface StoredQaChat {
  messages: ChatMessage[];
  updatedAt: string;
}

interface QaStatus {
  available: boolean;
  apiBaseUrl: string;
  configuredModel: string;
  activeModel: string;
  configuredModelInstalled: boolean;
  modelInstalled: boolean;
  usingFallbackModel: boolean;
  installedModels: Array<{
    name: string;
    size?: number;
    parameterSize?: string;
    quantizationLevel?: string;
  }>;
  error?: string;
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const QA_CHAT_STORAGE_KEY = 'qa:chat-history:v1';
const QA_CHAT_AUTOSAVE_DEBOUNCE_MS = 250;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string') return false;
  if (candidate.role !== 'user' && candidate.role !== 'assistant') return false;
  if (typeof candidate.content !== 'string') return false;
  if (candidate.model !== undefined && typeof candidate.model !== 'string') return false;
  if (candidate.error !== undefined && typeof candidate.error !== 'boolean') return false;
  return true;
}

function renderInlineSegments(segments: ChatInlineSegment[]) {
  return segments.map((segment, index) => {
    const key = `${segment.type}-${index}`;

    if (segment.type === 'strong') {
      return (
        <strong key={key} className="font-semibold text-slate-100 dark:text-white">
          {segment.content}
        </strong>
      );
    }

    if (segment.type === 'em') {
      return (
        <em key={key} className="italic text-slate-100/95 dark:text-slate-100">
          {segment.content}
        </em>
      );
    }

    if (segment.type === 'code') {
      return (
        <code key={key} className="rounded-md bg-slate-900/10 px-1.5 py-0.5 text-[0.95em] text-indigo-200 dark:bg-white/10 dark:text-indigo-100">
          {segment.content}
        </code>
      );
    }

    return <span key={key}>{segment.content}</span>;
  });
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const blocks = parseChatContent(content);

  return (
    <div className="space-y-4 leading-8 text-slate-700 dark:text-slate-100">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'heading') {
          return (
            <h3 key={key} className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {renderInlineSegments(block.content)}
            </h3>
          );
        }

        if (block.type === 'unordered-list') {
          return (
            <ul key={key} className="list-disc space-y-2 pl-6 marker:text-indigo-300">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="pl-1">
                  {renderInlineSegments(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ordered-list') {
          return (
            <ol key={key} className="list-decimal space-y-2 pl-6 marker:text-indigo-300">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="pl-1">
                  {renderInlineSegments(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'code') {
          return (
            <div key={key} className="overflow-x-auto rounded-2xl border border-border bg-slate-950/80 p-4 text-sm text-slate-100">
              {block.language ? <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">{block.language}</div> : null}
              <pre className="whitespace-pre-wrap font-mono leading-6 text-slate-100">
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        return (
          <p key={key} className="whitespace-pre-wrap leading-8 text-slate-700 dark:text-slate-100">
            {renderInlineSegments(block.content)}
          </p>
        );
      })}
    </div>
  );
}

export function QaWorkbench() {
  const [status, setStatus] = useState<QaStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  async function loadStatus() {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/qa/status', { cache: 'no-store' });
      const data = (await response.json()) as QaStatus;
      setStatus(data);
    } catch (error) {
      setStatus({
        available: false,
        apiBaseUrl: 'http://127.0.0.1:11434/api',
        configuredModel: 'qwen3',
        activeModel: 'qwen3',
        configuredModelInstalled: false,
        modelInstalled: false,
        usingFallbackModel: false,
        installedModels: [],
        error: error instanceof Error ? error.message : 'Unable to check Ollama status.',
      });
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadChatHistory() {
      try {
        const stored = await getKv<StoredQaChat>(QA_CHAT_STORAGE_KEY);
        if (cancelled || !stored) return;
        const nextMessages = Array.isArray(stored.messages) ? stored.messages.filter(isChatMessage) : [];
        setMessages(nextMessages);
      } catch {
        // Ignore persistence read failures and start with an empty chat.
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    }

    void loadChatHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, submitting]);

  useEffect(() => {
    if (!historyReady) return;
    const timer = setTimeout(() => {
      void setKv<StoredQaChat>(QA_CHAT_STORAGE_KEY, {
        messages,
        updatedAt: new Date().toISOString(),
      });
    }, QA_CHAT_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [historyReady, messages]);

  async function submitQuestion(nextQuestion?: string) {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt || submitting) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: createMessageId(),
        role: 'user',
        content: prompt,
      },
    ];

    setMessages(nextMessages);
    setQuestion('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/qa/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        model?: string;
        error?: string;
        status?: QaStatus;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'The local model did not return a usable answer.');
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: data.reply!,
          model: data.model,
        },
      ]);

      if (data.status) {
        setStatus(data.status);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to get an answer right now.';
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: message,
          error: true,
        },
      ]);
      await loadStatus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!submitting && question.trim() && status?.available && status.modelInstalled) {
        void submitQuestion();
      }
    }
  }

  const canSend = Boolean(question.trim()) && !submitting && Boolean(status?.available && status.modelInstalled);

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <SectionCard
        title="Chat with AI"
        action={
          <button
            type="button"
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-muted/55 dark:text-slate-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear Chat
          </button>
        }
      >
        <div className="space-y-4">
          {statusLoading || !status?.available || !status?.modelInstalled ? (
            <div
              className={cn(
                'rounded-2xl border p-3 text-sm',
                statusLoading
                  ? 'border-border bg-card'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                <span className="font-medium">
                  {statusLoading ? 'Checking local Ollama connection...' : 'Local model is not ready yet'}
                </span>
              </div>
              {!statusLoading ? (
                <p className="mt-2 leading-relaxed">
                  {status?.available
                    ? `Ollama is reachable at ${status?.apiBaseUrl}, but the configured model is not installed yet.`
                    : `Could not reach Ollama at ${status?.apiBaseUrl}. Start Ollama on this machine, then refresh the connection.`}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="max-h-[720px] min-h-[560px] space-y-3 overflow-auto rounded-2xl border border-border bg-card/70 p-3 md:p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-2xl p-4 text-sm shadow-sm',
                  message.role === 'assistant'
                    ? message.error
                      ? 'border border-amber-500/30 bg-amber-500/10'
                      : 'border border-border bg-white/80 dark:bg-slate-950/40'
                    : 'ml-auto max-w-[92%] bg-accent/10 text-slate-900 dark:text-slate-100',
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : null}
                  {message.role}
                </div>
                {message.role === 'assistant' ? (
                  <FormattedAssistantMessage content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-100">{message.content}</p>
                )}
              </div>
            ))}

            {submitting ? (
              <div className="rounded-2xl border border-border bg-white/80 p-4 text-sm dark:bg-slate-950/40">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <Bot className="h-4 w-4" />
                  assistant
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking..........
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="rounded-2xl border border-border bg-card/80 p-3">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className="min-h-[132px] w-full resize-none rounded-xl border border-border bg-transparent p-3 text-sm outline-none transition focus:border-accent"
              placeholder="Ask me"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Press Enter to send. Use Shift+Enter for a new line.
              </p>
              <button
                type="button"
                onClick={() => void submitQuestion()}
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Ask
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
