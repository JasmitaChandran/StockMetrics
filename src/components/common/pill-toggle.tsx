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
    <div className={cn('inline-flex rounded-full border border-border/70 bg-card/80 p-1 shadow-panel', className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative rounded-full px-2 py-1.5 text-xs font-medium transition-colors duration-150 sm:px-3',
            value === opt.value
              ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 text-white shadow-violet'
              : 'text-slate-600 hover:bg-muted/70 dark:text-slate-300',
          )}
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
