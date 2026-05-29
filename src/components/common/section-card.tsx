import { cn } from '@/lib/utils/cn';

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  disablePerfContainment = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disablePerfContainment?: boolean;
}) {
  return (
    <section className={cn('ui-panel glass rounded-2xl p-3 shadow-panel sm:p-4', !disablePerfContainment && 'perf-section', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
