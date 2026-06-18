export default function ClientsLoading() {
  const rows = Array.from({ length: 8 });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/70" />
        </div>
        <div className="h-9 w-44 animate-pulse rounded-xl bg-primary/10 sm:self-start" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted/60 sm:max-w-md" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-muted/60 sm:ml-auto" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-11 border-b bg-muted/30" />
        <ul className="divide-y">
          {rows.map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4"
            >
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-primary/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted/60 sm:hidden" />
              </div>
              <div className="hidden h-4 w-32 animate-pulse rounded-md bg-muted/60 sm:block" />
              <div className="hidden h-4 w-28 animate-pulse rounded-md bg-muted/60 md:block" />
              <div className="hidden h-4 w-24 animate-pulse rounded-md bg-muted/60 lg:block" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
