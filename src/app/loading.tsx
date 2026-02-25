export default function GlobalLoading() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-3xl border border-border bg-card" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}
