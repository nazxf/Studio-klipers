import Link from "next/link";
import { Clock3, Scissors } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/server/current-user";
import { listClipsForUser } from "@/server/clips";

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getClipStatusVariant(status: string) {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "PROCESSING") {
    return "default";
  }

  if (status === "FAILED") {
    return "error";
  }

  return "warning";
}

export default async function ClipsPage() {
  const user = await requireCurrentUser("/clips");
  const clips = await listClipsForUser(user.id);

  return (
    <DashboardShell user={user}>
      <PageHeader
        eyebrow="Cuts"
        title="Clips"
        description="Clip records created from your own source videos."
        action={
          <Button asChild>
            <Link href="/videos">
              <Scissors aria-hidden="true" />
              Create from video
            </Link>
          </Button>
        }
      />

      <section className="mt-8">
        {clips.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="No clips created yet"
            description="Clip records will appear here after the video detail workflow creates start and end ranges."
            action={
              <Button asChild variant="secondary">
                <Link href="/videos">
                  <Scissors aria-hidden="true" />
                  Choose a source video
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {clips.map((clip) => (
              <Card key={clip.id} className="shadow-none">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                      <Scissors className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-foreground">
                          {clip.title}
                        </h2>
                        <Badge variant={getClipStatusVariant(clip.status)}>{clip.status}</Badge>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {clip.videoTitle || clip.videoFileName}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:min-w-96 sm:grid-cols-3 sm:text-right">
                    <p className="inline-flex items-center gap-1 sm:justify-end">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {formatSeconds(clip.startSeconds)} to {formatSeconds(clip.endSeconds)}
                    </p>
                    <p>{formatSeconds(clip.durationSeconds)}</p>
                    <p>{formatDate(clip.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
