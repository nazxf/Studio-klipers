"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "neutral" | "accent";
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      <Card className="h-full overflow-hidden shadow-none">
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
          <p className="text-sm leading-6 text-muted-foreground">{helper}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
