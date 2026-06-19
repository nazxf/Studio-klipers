"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

/**
 * Wraps a word/phrase with a hand-drawn lime marker stroke beneath it — the
 * brand-safe translation of the playful "underline the keyword" hero motif.
 * The text keeps its own color; lime lives only in the accent stroke, so it
 * stays a single deliberate signal mark rather than decoration.
 *
 * The stroke "draws itself in" left→right via `pathLength` on mount. When the
 * user prefers reduced motion (or `animate={false}`), it renders fully drawn
 * with no animation. Decorative only: the SVG is aria-hidden and the text
 * stays readable on its own.
 */
export function AccentUnderline({
  children,
  className,
  strokeClassName,
  animate = true,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  strokeClassName?: string;
  /** When false, render the stroke fully drawn with no animation. */
  animate?: boolean;
  /** Seconds to wait before the stroke starts drawing in. */
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 300 18"
        preserveAspectRatio="none"
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-[0.12em] h-[0.42em] w-full text-primary",
          strokeClassName,
        )}
      >
        <motion.path
          d="M4 11 C 64 3, 116 4, 156 9 S 246 16, 296 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          initial={shouldAnimate ? { pathLength: 0 } : false}
          animate={shouldAnimate ? { pathLength: 1 } : { pathLength: 1 }}
          transition={
            shouldAnimate ? { duration: 0.6, ease: easeOut, delay } : { duration: 0 }
          }
        />
      </svg>
    </span>
  );
}
