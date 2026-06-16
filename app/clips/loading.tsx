import { Skeleton } from "@/components/ui/skeleton";

export default function ClipsLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background" role="status" aria-label="Loading clips">
      {/* Topbar skeleton */}
      <div className="h-14 border-b border-border bg-card" />

      <div className="flex flex-1">
        {/* Sidebar skeleton */}
        <div className="hidden w-60 border-r border-border bg-card lg:block">
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Page header skeleton */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-7 w-24 bg-secondary/60" />
              <Skeleton className="h-4 w-80 bg-secondary/40" />
            </div>
            <Skeleton className="h-9 w-36" />
          </div>

          {/* Clip list skeleton */}
          <div className="mt-8 grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-32 rounded-lg border border-border bg-card"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
