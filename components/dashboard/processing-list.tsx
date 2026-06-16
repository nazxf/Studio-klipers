import { Clock3, FileVideo2, Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
      <CardContent className="space-y-4">
        {jobs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/35 p-5">
            <p className="text-sm font-semibold text-foreground">No jobs queued</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Create a clip from a video detail page. Pending jobs are processed by npm run worker:clips.
            </p>
          </div>
        ) : null}

        {jobs.map((job) => {
          const Icon = getJobIcon(job.status);

          return (
            <div key={job.id} className="rounded-md border border-border bg-secondary/45 p-4 transition-colors duration-150 hover:border-primary/20 hover:bg-secondary/60">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
                    <Badge variant={getBadgeVariant(job.status)}>{job.status}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{job.detail}</p>
                  <Progress className="mt-3" value={job.progress} />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
