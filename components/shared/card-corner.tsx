import { ConcentricRings } from "@/components/shared/concentric-rings";
import { cn } from "@/lib/utils";

/**
 * Subtle concentric-ring motif tucked into a card corner — ties the landing
 * sections back to the hero's "scope" texture. Neutral border color (never
 * lime); brightens slightly on hover when the card is a `group`. Place as a
 * sibling inside a `relative overflow-hidden` card, before the (positioned)
 * content. Decorative only.
 */
export function CardCorner({ className }: { className?: string }) {
  return (
    <ConcentricRings
      className={cn(
        "absolute -right-10 -top-10 h-24 w-24 opacity-40 transition-opacity duration-200 group-hover:opacity-70",
        className,
      )}
    />
  );
}
