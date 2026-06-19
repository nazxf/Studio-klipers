"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

/**
 * Hand-drawn lime pointer that draws itself in (pathLength) to guide the eye
 * toward the primary action — the brand-safe take on the playful doodle arrow.
 * Lime is justified here because it points AT the signal (the primary CTA).
 * Decorative: aria-hidden, points right by default.
 */
export function DoodleArrow({
  className,
  animate = true,
  delay = 0,
}: {
  className?: string;
  /** When false, render fully drawn with no animation. */
  animate?: boolean;
  /** Seconds to wait before the arrow starts drawing in. */
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const stroke = (extraDelay: number) => ({
    initial: shouldAnimate ? ({ pathLength: 0 } as const) : false,
    animate: { pathLength: 1 } as const,
    transition: shouldAnimate
      ? { duration: 0.5, ease: easeOut, delay: delay + extraDelay }
      : { duration: 0 },
  });

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 72 40"
      fill="none"
      className={cn("pointer-events-none text-primary", className)}
    >
      {/* Shaft: gentle arc sweeping left→right toward the CTA. */}
      <motion.path
        d="M5 24 C 24 12, 46 12, 63 19"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...stroke(0)}
      />
      {/* Arrowhead: open ">" whose vertex meets the shaft tip (~63,19). */}
      <motion.path
        d="M52 9 L65 19 L51 27"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...stroke(0.35)}
      />
    </svg>
  );
}
