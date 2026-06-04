import Link from "next/link";
import { Clock3, Download, ExternalLink, FileVideo2, Play, Scissors } from "lucide-react";

import { ClipStatusRefresh } from "@/components/clips/clip-status-refresh";
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

function formatBytes(sizeBytes: string | null) {
  if (!sizeBytes) {
    return "Output pending";
  }

  const size = Number(sizeBytes);

  if (!Number.isFinite(size) || size <= 0) {
    return "Output pending";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

function getClipStatusCopy(status: string, hasOutput: boolean) {
  if (status === "COMPLETED" && hasOutput) {
    return "Ready for protected preview and download.";
  }

  if (status === "COMPLETED") {
    return "Completed, but no local output file is registered.";
  }

  if (status === "PROCESSING") {
    return "The local worker is preparing the clip output.";
  }

  if (status === "FAILED") {
    return "Processing failed. Open the clip for the error details.";
  }

  return "Waiting for npm run worker:clips.";
}

export default async function ClipsPage() {
  const user = await requireCurrentUser("/clips");
  const clips = await listClipsForUser(user.id);
  const shouldRefresh = clips.some(
    (clip) => clip.status === "PENDING" || clip.status === "PROCESSING",
  );

  return (
    <DashboardShell user={user}>
      <ClipStatusRefresh enabled={shouldRefresh} />

      <PageHeader
        eyebrow="Cuts"
        title="Clips"
        description="Queued, processing, completed, and failed clips from your own source videos."
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
            description="Open a source video, choose a start and end time, then create a clip job for the local worker."
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
            {clips.map((clip) => {
              const canUseOutput = clip.status === "COMPLETED" && clip.hasOutput;

              return (
                <Card
                  key={clip.id}
                  className="shadow-none transition-colors duration-150 hover:border-primary/20 hover:bg-card/90"
                >
                  <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                        <Scissors className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/clips/${clip.id}`}
                            className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {clip.title}
                          </Link>
                          <Badge variant={getClipStatusVariant(clip.status)}>{clip.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {getClipStatusCopy(clip.status, clip.hasOutput)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            {formatSeconds(clip.startSeconds)} to {formatSeconds(clip.endSeconds)}
                          </span>
                          <span>{formatSeconds(clip.durationSeconds)}</span>
                          <Link
                            href={`/videos/${clip.videoId}`}
                            className="inline-flex min-w-0 items-center gap-1 transition-colors hover:text-foreground"
                          >
                            <FileVideo2 className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {clip.videoTitle || clip.videoFileName}
                            </span>
                          </Link>
                          <span>{formatDate(clip.createdAt)}</span>
                          {clip.status === "COMPLETED" ? (
                            <span>{formatBytes(clip.sizeBytes)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/clips/${clip.id}`}>
                          <ExternalLink aria-hidden="true" />
                          Open
                        </Link>
                      </Button>
                      {canUseOutput ? (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/api/clips/${clip.id}/stream`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <Play aria-hidden="true" />
                              Preview
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/api/clips/${clip.id}/download`}>
                              <Download aria-hidden="true" />
                              Download
                            </Link>
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
