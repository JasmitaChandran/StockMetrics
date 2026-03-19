import Image from 'next/image';
import { LineChart } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type AuthBackdropMode = 'login' | 'register' | 'account';

const modeGradient: Record<AuthBackdropMode, string> = {
  login: 'from-slate-950/80 via-indigo-950/65 to-slate-900/80',
  register: 'from-slate-950/80 via-blue-950/65 to-indigo-950/80',
  account: 'from-slate-950/80 via-cyan-950/62 to-indigo-950/80',
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
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-slate-950/42" />
        <div className={cn('absolute inset-0 bg-gradient-to-br', modeGradient[mode])} />
        <div className="absolute inset-0 backdrop-blur-[2px]" />

        <div className="relative z-10 grid gap-7 px-5 py-7 sm:px-7 md:py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:px-10">
          <div className="max-w-xl text-white">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
              <LineChart className="h-3.5 w-3.5" />
              Stock Metrics
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-lg text-sm text-slate-200 sm:text-base">{subtitle}</p> : null}
          </div>

          <div className={cn('w-full', contentClassName)}>{children}</div>
        </div>
      </div>
    </section>
  );
}
