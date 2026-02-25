'use client';

import { cn } from '@/lib/utils/cn';

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-full border border-border bg-card p-1', className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition',
            value === opt.value
              ? 'bg-accent text-white shadow'
              : 'text-slate-600 hover:bg-muted dark:text-slate-300',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
