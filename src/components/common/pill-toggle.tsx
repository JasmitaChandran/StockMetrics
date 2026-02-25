'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
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
  const id = useId();
  return (
    <div className={cn('inline-flex rounded-full border border-border/70 bg-card/80 p-1 shadow-panel backdrop-blur-sm', className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative rounded-full px-3 py-1.5 text-xs font-medium transition',
            value === opt.value
              ? 'text-white'
              : 'text-slate-600 hover:bg-muted/70 dark:text-slate-300',
          )}
        >
          {value === opt.value ? (
            <motion.span
              layoutId={`pill-${id}`}
              transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.75 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 shadow-violet"
            />
          ) : null}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
