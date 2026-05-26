import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { StockMetricsLogo } from '@/components/common/stock-metrics-logo';

type AuthBackdropMode = 'login' | 'register' | 'account';

const modeGradient: Record<AuthBackdropMode, string> = {
  login:
    'from-sky-100/90 via-indigo-100/80 to-cyan-100/90 dark:from-slate-950/80 dark:via-indigo-950/65 dark:to-slate-900/80',
  register:
    'from-cyan-100/90 via-sky-100/80 to-indigo-100/90 dark:from-slate-950/80 dark:via-blue-950/65 dark:to-indigo-950/80',
  account:
    'from-teal-100/90 via-cyan-100/80 to-sky-100/90 dark:from-slate-950/80 dark:via-cyan-950/62 dark:to-indigo-950/80',
};

type AuthBackdropShellProps = {
  mode: AuthBackdropMode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentClassName?: string;
};

export function AuthBackdropShell({ mode, title, subtitle, children, contentClassName }: AuthBackdropShellProps) {
  return (
    <section className="py-6 md:py-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[30px] border border-border/65">
        <Image
          src="/images/stocks-blur-bg.svg"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 1152px, (min-width: 1024px) calc(100vw - 64px), 100vw"
          className="object-cover object-center opacity-20 dark:opacity-100"
        />
        <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/42" />
        <div className={cn('absolute inset-0 bg-gradient-to-br', modeGradient[mode])} />
        <div className="absolute inset-0 backdrop-blur-[2px]" />

        <div className="relative z-10 grid gap-7 px-5 py-7 sm:px-7 md:py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:px-10">
          <div className="max-w-xl text-slate-900 dark:text-white">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-100">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/85 p-0.5 ring-1 ring-slate-300/80 dark:bg-slate-900/80 dark:ring-white/20">
                <StockMetricsLogo className="h-4 w-4" />
              </span>
              Stock Metrics
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-200 sm:text-base">{subtitle}</p> : null}
          </div>

          <div className={cn('w-full', contentClassName)}>{children}</div>
        </div>
      </div>
    </section>
  );
}
