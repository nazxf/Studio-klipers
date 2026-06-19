import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact "control room" stat tile used on list pages (Videos, Clips) to show
 * aggregate facts above the list. Set `accent` for the lime-highlighted primary tile.
 */
export function SummaryTile({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "panel-edge rounded-lg border p-4",
        accent ? "border-primary/25 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn("size-4", accent ? "text-primary" : "text-muted-foreground")}
          aria-hidden="true"
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
