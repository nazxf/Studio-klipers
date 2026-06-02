import { cn } from "@/lib/utils";

export function LoadingState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "panel-edge flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-5 w-full max-w-xs space-y-3" aria-hidden="true">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-signal-scan bg-primary/80" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 rounded-md border border-border bg-secondary/70" />
          <div className="h-12 rounded-md border border-border bg-secondary/45" />
          <div className="h-12 rounded-md border border-border bg-secondary/30" />
        </div>
      </div>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </section>
  );
}
