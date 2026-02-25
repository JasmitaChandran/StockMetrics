'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm text-white">
        Retry
      </button>
    </div>
  );
}
