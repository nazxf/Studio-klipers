"use client";

import { motion } from "framer-motion";
import { Clock3, FileVideo2, Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { staggerContainer, staggerItem, statusPulse } from "@/lib/motion";

type ProcessingJobItem = {
  id: string;
  title: string;
  detail: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
};

function getJobIcon(status: ProcessingJobItem["status"]) {
  if (status === "PROCESSING") {
    return Scissors;
  }

  if (status === "PENDING") {
    return Clock3;
  }

  return FileVideo2;
}

function getBadgeVariant(status: ProcessingJobItem["status"]) {
  if (status === "PROCESSING") {
    return "default";
  }

  if (status === "PENDING") {
    return "warning";
  }

  if (status === "FAILED") {
    return "error";
  }

  return "success";
}

export function ProcessingList({ jobs }: { jobs: ProcessingJobItem[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Render queue</CardTitle>
        <CardDescription>Local worker jobs recorded for your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/35 p-5">
            <p className="text-sm font-semibold text-foreground">No jobs queued</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Create a clip from a video detail page. Pending jobs are processed by npm run worker:clips.
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-4"
          >
            {jobs.map((job) => {
              const Icon = getJobIcon(job.status);
              const isActive = job.status === "PROCESSING";

              return (
                <motion.div
                  key={job.id}
                  variants={staggerItem}
                  className="rounded-md border border-border bg-secondary/45 p-4 transition-colors duration-150 hover:border-primary/20 hover:bg-secondary/60"
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      variants={statusPulse}
                      initial="idle"
                      animate={isActive ? "active" : "idle"}
                      className="flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                        <Badge variant={getBadgeVariant(job.status)}>{job.status}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{job.detail}</p>
                      <Progress className="mt-3" value={job.progress} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
