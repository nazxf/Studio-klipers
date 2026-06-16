"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RadioTower, UploadCloud, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scaleIn } from "@/lib/motion";

export function UploadDropzonePreview() {
  return (
    <motion.div initial="hidden" animate="visible" variants={scaleIn}>
    <Card className="overflow-hidden shadow-none">
      <CardHeader>
        <CardTitle>Source intake</CardTitle>
        <CardDescription>
          Local MP4 upload is active for development and MVP source storage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative min-h-[260px] overflow-hidden rounded-lg border border-dashed border-primary/25 bg-background/65 p-5">
          <div className="absolute inset-x-5 top-5 h-px overflow-hidden bg-border" aria-hidden="true">
            <div className="h-full w-1/3 animate-signal-scan bg-primary/80" />
          </div>
          <div className="grid min-h-[220px] gap-5 pt-5 md:grid-cols-[0.86fr_1fr]">
            <div className="flex flex-col justify-between rounded-md border border-border bg-card/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Intake
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Drop MP4 source
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Validate one MP4 up to 100 MB, store it locally, and register source metadata.
                </p>
              </div>
              <Button asChild className="mt-5 w-full">
                <Link href="/upload">
                  <UploadCloud aria-hidden="true" />
                  Select MP4
                </Link>
              </Button>
            </div>
            <div className="flex flex-col justify-between rounded-md border border-border bg-secondary/45 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                    Source monitor
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Ready for authenticated uploads.</p>
                </div>
                <RadioTower className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="mt-8 space-y-3">
                {["Duration scan", "Codec check", "Clip target"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded border border-border bg-card/70 px-3 py-2">
                    <span className="text-sm text-foreground">{item}</span>
                    <Video className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
