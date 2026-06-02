"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, KeyRound, Play, Scissors, UploadCloud } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";

const workflow = [
  "Upload MP4",
  "Pick start and end",
  "Create clip",
  "Preview and download",
];

export default function HomePage() {
  return (
    <main className="control-room min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <header className="border-b border-border bg-background/88 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandMark />
          <nav className="flex items-center gap-2" aria-label="Landing navigation">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">
                Open cockpit
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="surface-grid relative">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:min-h-[calc(92dvh-4rem)] lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex max-w-2xl flex-col justify-center"
          >
            <motion.div variants={staggerItem}>
              <Badge variant="secondary">Creator control room</Badge>
            </motion.div>
            <motion.h1
              variants={staggerItem}
              className="text-balance mt-6 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl"
            >
              Studio Klipers
            </motion.h1>
            <motion.p
              variants={staggerItem}
              className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              Turn long creator footage into clean clip decisions inside a focused workspace built
              for intake, timing, render status, and delivery.
            </motion.p>
            <motion.div variants={staggerItem} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Open cockpit
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">
                  Login UI
                  <KeyRound aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
            <motion.ul
              variants={staggerItem}
              className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2"
            >
              {workflow.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative flex items-center lg:justify-end"
          >
            <Card className="w-full overflow-hidden shadow-panel">
              <CardContent className="p-0">
                <div className="border-b border-border bg-secondary/65 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 overflow-hidden rounded-lg border border-primary/20 bg-card">
                        <Image src="/brand-mark.png" alt="" fill sizes="40px" className="object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold tracking-tight">Creator workspace</p>
                        <p className="font-mono text-[11px] text-muted-foreground">Static product preview</p>
                      </div>
                    </div>
                    <Badge>Ready</Badge>
                  </div>
                </div>
                <div className="grid gap-0 md:grid-cols-[1fr_0.78fr]">
                  <div className="border-b border-border p-5 md:border-b-0 md:border-r">
                    <div className="aspect-video rounded-lg border border-border bg-background p-3">
                      <div className="relative flex h-full items-center justify-center overflow-hidden rounded-md bg-secondary">
                        <div className="absolute inset-x-5 top-5 h-px bg-border" aria-hidden="true" />
                        <div className="absolute bottom-5 left-5 right-5 h-8 rounded border border-border bg-background/75" aria-hidden="true" />
                        <div className="flex size-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                          <Play className="ml-0.5 size-6" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="h-2 rounded-full bg-primary" />
                      <div className="h-2 rounded-full bg-border" />
                      <div className="h-2 rounded-full bg-border" />
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="rounded-md border border-border bg-secondary/60 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <UploadCloud className="size-4 text-primary" aria-hidden="true" />
                        Upload source
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Keep the original video organized before clipping.
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/60 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Scissors className="size-4 text-primary" aria-hidden="true" />
                        Select a clean range
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span className="rounded border border-border bg-card px-2 py-2 font-mono">00:14.2</span>
                        <span className="rounded border border-border bg-card px-2 py-2 font-mono">00:42.8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/35">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Workflow signal
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Built around the clipping pass.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            {[
              ["Intake first", "Source video, timing decisions, and render status stay close together."],
              ["Signal color", "Lime marks action, selection, progress, and success only."],
              ["Phase ready", "Auth can connect next without replacing the visual system."],
            ].map(([title, description]) => (
              <div key={title} className="panel-edge rounded-lg border border-border bg-card p-5 md:first:row-span-2">
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
