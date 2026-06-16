export default function DashboardLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background" role="status" aria-label="Loading dashboard">
      {/* Topbar skeleton */}
      <div className="h-14 border-b border-border bg-card" />

      <div className="flex flex-1">
        {/* Sidebar skeleton */}
        <div className="hidden w-60 border-r border-border bg-card lg:block">
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-secondary/50" />
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Page header skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-secondary/50" />
            <div className="h-7 w-48 animate-pulse rounded bg-secondary/60" />
            <div className="h-4 w-72 animate-pulse rounded bg-secondary/40" />
          </div>

          {/* Stats cards skeleton */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-border bg-card"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>

          {/* Recent activity skeleton */}
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-border bg-card"
                style={{ animationDelay: `${(i + 4) * 100}ms` }}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
