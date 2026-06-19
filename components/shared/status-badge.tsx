import { Badge } from "@/components/ui/badge";
import { getClipStatusVariant, getVideoStatusVariant } from "@/lib/status-helpers";
import { cn } from "@/lib/utils";

function toStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({
  status,
  kind,
  className,
}: {
  status: string;
  kind: "video" | "clip";
  className?: string;
}) {
  const variant =
    kind === "video" ? getVideoStatusVariant(status) : getClipStatusVariant(status);
  const isActive = status === "PROCESSING";

  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          isActive && "motion-safe:animate-pulse",
        )}
        aria-hidden="true"
      />
      {toStatusLabel(status)}
    </Badge>
  );
}
