import { Navbar } from './navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[8%] top-24 h-52 w-52 rounded-full bg-indigo-500/14 blur-3xl motion-safe:animate-pulseSoft" />
        <div className="absolute right-[10%] top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl motion-safe:animate-driftSlow" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/8 blur-3xl motion-safe:animate-float" />
      </div>
      <Navbar />
      <main className="mx-auto max-w-[1450px] px-4 py-6 md:px-5">{children}</main>
    </div>
  );
}
