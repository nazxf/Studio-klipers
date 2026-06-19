import { cn } from "@/lib/utils";

/**
 * Concentric "scope/radar" rings — an ambient control-room motif (the brand-safe
 * read of the reference's playful target doodle). Neutral border color, never
 * lime: this is texture, not a signal. Decorative only (aria-hidden); size and
 * opacity are controlled by the caller via className.
 */
export function ConcentricRings({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      fill="none"
      className={cn("pointer-events-none text-border", className)}
    >
      {[28, 50, 72, 94].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="1" />
      ))}
      <circle cx="100" cy="100" r="2.5" fill="currentColor" />
    </svg>
  );
}
