export default function ClientDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-44 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded-md bg-muted/60" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-56 animate-pulse rounded-md bg-muted/60" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 h-7 w-7 shrink-0 animate-pulse rounded-md bg-primary/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-20 animate-pulse rounded bg-muted/60" />
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded-md bg-muted/60" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-muted/60" />
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 space-y-2">
              <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded-md bg-muted/60" />
            </div>
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-muted/60" />
              <div className="h-9 w-full animate-pulse rounded-xl bg-primary/10" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 space-y-2">
              <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded-md bg-muted/60" />
            </div>
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/60" />
                    </div>
                    <div className="h-4 w-12 animate-pulse rounded-full bg-muted/60" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
