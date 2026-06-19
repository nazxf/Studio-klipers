"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Download,
  KeyRound,
  Play,
  Scissors,
  UploadCloud,
} from "lucide-react";

import { AccentUnderline } from "@/components/shared/accent-underline";
import { CardCorner } from "@/components/shared/card-corner";
import { ConcentricRings } from "@/components/shared/concentric-rings";
import { DoodleArrow } from "@/components/shared/doodle-arrow";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { staggerContainer, staggerItem } from "@/lib/motion";

const steps = [
  {
    icon: UploadCloud,
    title: "Upload MP4",
    description: "Bring in raw footage. Each source stays organized and ready to clip.",
  },
  {
    icon: Scissors,
    title: "Trim the range",
    description: "Set a clean start and end on the timeline — no scrubbing guesswork.",
  },
  {
    icon: Play,
    title: "Render the clip",
    description: "Queue the job and watch render status without leaving the workspace.",
  },
  {
    icon: Download,
    title: "Preview & deliver",
    description: "Review the result and pull the final file the moment it lands.",
  },
];

const capabilities: Array<[string, string]> = [
  ["Intake first", "Source video, timing, and render status stay in one focused view."],
  ["Signal color", "Lime marks one thing at a time — action, selection, progress, done."],
  ["Built to extend", "Auth and delivery slot in without redrawing the visual system."],
];

const heroPills = ["MP4 in", "Frame-safe trim", "Local render queue"];

const viewport = { once: true, margin: "-80px" } as const;

export default function HomePage() {
  return (
    <main className="control-room min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full border border-border bg-background/70 py-2 pl-3 pr-2 shadow-panel-sm backdrop-blur">
          <BrandMark />
          <nav className="flex items-center gap-1.5" aria-label="Landing navigation">
            <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/dashboard">
                Open cockpit
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="surface-grid relative overflow-hidden border-b border-border">
        <ConcentricRings className="absolute -bottom-24 -left-20 h-80 w-80 opacity-50 sm:h-[26rem] sm:w-[26rem]" />
        <ConcentricRings className="absolute -right-24 -top-16 hidden h-80 w-80 opacity-40 lg:block" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28"
        >
          <motion.div variants={staggerItem}>
            <Badge variant="secondary">Creator control room</Badge>
          </motion.div>
          <motion.h1
            variants={staggerContainer}
            className="text-balance mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-7xl"
          >
            <motion.span variants={staggerItem} className="block">
              Long footage in.
            </motion.span>
            <motion.span variants={staggerItem} className="block">
              <AccentUnderline delay={0.5}>Clean clips out.</AccentUnderline>
            </motion.span>
          </motion.h1>
          <motion.p
            variants={staggerItem}
            className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
          >
            Studio Klipers is a focused workspace for the clipping pass — intake, timing,
            render status, and delivery, without the editor bloat.
          </motion.p>
          <motion.div variants={staggerItem} className="relative mt-8 flex flex-col gap-3 sm:flex-row">
            <DoodleArrow
              delay={0.95}
              className="absolute right-full top-1/2 hidden h-16 w-28 -translate-y-1/2 -translate-x-1 sm:block"
            />
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open cockpit
                <span
                  aria-hidden="true"
                  className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/15"
                >
                  <ArrowRight />
                </span>
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
            className="mt-8 flex flex-wrap justify-center gap-2"
            aria-label="What the workspace handles"
          >
            {heroPills.map((pill) => (
              <li
                key={pill}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                {pill}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              The clipping pass
            </p>
            <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Four steps from raw footage to a finished clip.
            </h2>
          </div>

          <motion.ol
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                variants={staggerItem}
                className="panel-edge group relative overflow-hidden rounded-xl border border-border bg-card p-5"
              >
                <CardCorner className="-bottom-12 -right-12 top-auto" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-secondary text-primary">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* Why it stays focused */}
      <section className="border-b border-border bg-secondary/25">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              Design intent
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built around the work, not the chrome.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {capabilities.map(([title, description]) => (
              <div
                key={title}
                className="panel-edge group relative overflow-hidden rounded-xl border border-border bg-card p-5"
              >
                <CardCorner />
                <div className="relative">
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="surface-grid border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="panel-edge flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Open the workspace and make the first cut.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Step into the cockpit, or preview the login experience first.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Open cockpit
                  <span
                    aria-hidden="true"
                    className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/15"
                  >
                    <ArrowRight />
                  </span>
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">Login UI</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Login
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <span className="font-mono text-xs">© 2026 Studio Klipers</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
