"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  href,
  className,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "neutral" | "accent";
  href?: string;
  className?: string;
}) {
  const card = (
    <Card
      className={cn(
        "h-full overflow-hidden shadow-none",
        href && "transition-colors duration-150 group-hover:border-primary/30 group-hover:bg-card/90",
      )}
    >
      <CardContent className="relative flex h-full flex-col justify-between gap-6 p-5">
        {tone === "accent" ? (
          <div className="absolute inset-x-5 top-0 h-px bg-primary/55" aria-hidden="true" />
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 font-mono text-4xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-md border",
              tone === "accent"
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm leading-6 text-muted-foreground">{helper}</p>
          {href ? (
            <ArrowUpRight
              className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div variants={staggerItem} className={cn("group", className)}>
      {href ? (
        <Link href={href} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          {card}
        </Link>
      ) : (
        card
      )}
    </motion.div>
  );
}
