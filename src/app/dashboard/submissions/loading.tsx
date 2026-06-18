export default function SubmissionsLoading() {
  const rows = Array.from({ length: 6 });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1 shadow-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-16 animate-pulse rounded-lg bg-muted/60"
            />
          ))}
        </div>
        <div className="h-9 w-full animate-pulse rounded-xl bg-muted/60 sm:max-w-xs" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-11 border-b bg-muted/30" />
        <ul className="divide-y divide-border">
          {rows.map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted/60 sm:hidden" />
              </div>
              <div className="hidden h-4 w-32 animate-pulse rounded-md bg-muted/60 sm:block" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted/60" />
              <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted/60 md:block" />
              <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted/60 md:block" />
              <div className="flex gap-1">
                <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-8 w-14 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-8 w-14 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-8 w-14 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-8 w-14 animate-pulse rounded-lg bg-muted/60" />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-4 sm:px-6">
          <div className="h-3 w-40 animate-pulse rounded-md bg-muted/60" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
