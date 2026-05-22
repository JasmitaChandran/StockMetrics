import { Navbar } from './navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-[1760px] px-3 py-6 md:px-6 lg:px-8">{children}</main>
    </div>
  );
}
