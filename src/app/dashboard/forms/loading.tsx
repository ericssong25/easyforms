export default function FormsLoading() {
  const cards = Array.from({ length: 6 });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/70" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-xl bg-primary/10 sm:self-start" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-primary/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted/60" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-3 w-10 animate-pulse rounded-md bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
