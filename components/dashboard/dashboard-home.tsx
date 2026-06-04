"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock3,
  Download,
  FileVideo2,
  Scissors,
  UploadCloud,
} from "lucide-react";

import { ProcessingList } from "@/components/dashboard/processing-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { UploadDropzonePreview } from "@/components/dashboard/upload-dropzone-preview";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pageTransition, staggerContainer } from "@/lib/motion";

type DashboardStats = {
  videoCount: number;
  clipCount: number;
  processingCount: number;
  readyClipCount: number;
};

type ProcessingJobItem = {
  id: string;
  title: string;
  detail: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  createdAt: string;
};

function formatCount(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function DashboardHome({
  processingJobs,
  stats,
}: {
  processingJobs: ProcessingJobItem[];
  stats: DashboardStats;
}) {
  const statCards = [
    {
      label: "Source videos",
      value: formatCount(stats.videoCount),
      helper: "Videos owned by this workspace account.",
      icon: FileVideo2,
      tone: "neutral" as const,
    },
    {
      label: "Clips created",
      value: formatCount(stats.clipCount),
      helper: "Clip records scoped to the current user.",
      icon: Scissors,
      tone: "accent" as const,
    },
    {
      label: "Processing",
      value: formatCount(stats.processingCount),
      helper: "Pending or active processing jobs.",
      icon: Clock3,
      tone: "neutral" as const,
    },
    {
      label: "Ready clips",
      value: formatCount(stats.readyClipCount),
      helper: "Completed clips ready for preview and download.",
      icon: Download,
      tone: "neutral" as const,
    },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={pageTransition}>
      <PageHeader
        eyebrow="Workspace"
        title="Creator operations cockpit"
        description="A focused command surface for local MP4 intake, clip decisions, and worker status."
        action={
          <Button asChild>
            <Link href="/upload">
              <UploadCloud aria-hidden="true" />
              Local MP4 upload
            </Link>
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Authenticated workspace</Badge>
        <Badge variant="outline">Dark charcoal</Badge>
        <Badge variant="outline">Neon lime actions</Badge>
      </div>

      <motion.section
        variants={staggerContainer}
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_0.92fr_0.92fr]"
      >
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </motion.section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <UploadDropzonePreview />
        <WorkflowCard />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ProcessingList jobs={processingJobs} />
        <EmptyState
          icon={Scissors}
          title="Clip library waiting"
          description="Create a range from a video detail page, then run npm run worker:clips to produce the next pending clip."
          action={
            <Button asChild variant="secondary">
              <Link href="/videos">
                <Scissors aria-hidden="true" />
                Choose source
              </Link>
            </Button>
          }
        />
      </section>
    </motion.div>
  );
}
