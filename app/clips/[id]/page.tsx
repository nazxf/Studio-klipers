import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  Clock3,
  Download,
  ExternalLink,
  FileVideo2,
  HardDrive,
  Play,
  Scissors,
  Timer,
} from "lucide-react";

import { ClipStatusRefresh } from "@/components/clips/clip-status-refresh";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnimatedPage } from "@/components/motion/animated-page";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDate, formatSeconds } from "@/lib/formatters";
import { auth } from "@/lib/auth";
import { requireCurrentUser } from "@/server/current-user";
import { getClipForUser } from "@/server/clips";

function getStatusCopy(status: string) {
  if (status === "COMPLETED") {
    return {
      title: "Clip ready",
      description: "The protected output is ready to preview and download.",
    };
  }

  if (status === "PROCESSING") {
    return {
      title: "Processing clip",
      description: "The local worker is preparing the MP4 output. This page refreshes while the job is active.",
    };
  }

  if (status === "FAILED") {
    return {
      title: "Processing failed",
      description: "The output could not be created. The source video is still available.",
    };
  }

  return {
    title: "Queued",
    description: "This clip is queued and will be processed shortly.",
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return {
      title: "Clip detail",
    };
  }

  const clip = await getClipForUser({
    clipId: id,
    userId: session.user.id,
  });

  if (!clip) {
    notFound();
  }

  return {
    title: `${clip.title} - Studio Klipers`,
  };
}

export default async function ClipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser(`/clips/${id}`);
  const clip = await getClipForUser({
    clipId: id,
    userId: user.id,
  });

  if (!clip) {
    notFound();
  }

  const shouldRefreshClip = clip.status === "PENDING" || clip.status === "PROCESSING";
  const isRefreshing = shouldRefreshClip;
  const canUseOutput = clip.status === "COMPLETED" && clip.hasOutput;
  const statusCopy = getStatusCopy(clip.status);
  const progress =
    clip.latestJob?.progress ??
    (clip.status === "COMPLETED" ? 100 : clip.status === "PROCESSING" ? 10 : 0);
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const failedMessage = clip.errorMessage ?? clip.latestJob?.errorMessage;

  const sourceDuration =
    clip.video.durationSeconds && clip.video.durationSeconds > 0
      ? clip.video.durationSeconds
      : null;
  const clampPct = (value: number) => Math.min(100, Math.max(0, value));
  const rangeLeft = sourceDuration !== null ? clampPct((clip.startSeconds / sourceDuration) * 100) : 0;
  const rangeRight = sourceDuration !== null ? clampPct((clip.endSeconds / sourceDuration) * 100) : 100;
  const rangeWidth = Math.max(rangeRight - rangeLeft, 1.5);

  return (
    <DashboardShell user={user}>
      <ClipStatusRefresh enabled={isRefreshing} />

      <AnimatedPage>
        <PageHeader
          eyebrow="Clip detail"
          title={clip.title}
          description="Protected local output, source context, and worker status."
        action={
          canUseOutput ? (
            <Button asChild>
              <Link href={`/api/clips/${clip.id}/download`}>
                <Download aria-hidden="true" />
                Download
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <StatusBadge kind="clip" status={clip.status} />
        <Badge variant="outline">
          <Scissors aria-hidden="true" />
          {formatSeconds(clip.durationSeconds)}
        </Badge>
        <Badge variant="outline">
          <HardDrive aria-hidden="true" />
          Local output
        </Badge>
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden shadow-panel">
          <CardContent className="p-0">
            {canUseOutput ? (
              <video
                className="aspect-video w-full bg-black"
                controls
                preload="metadata"
                src={`/api/clips/${clip.id}/stream`}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-secondary/55 p-6 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                    {clip.status === "FAILED" ? (
                      <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
                    ) : (
                      <Play className="size-5" aria-hidden="true" />
                    )}
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-foreground">
                    {statusCopy.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {statusCopy.description}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                Trim range
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                {sourceDuration !== null
                  ? `of ${formatSeconds(sourceDuration)} source`
                  : "Source length unknown"}
              </span>
            </div>
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary"
              aria-hidden="true"
            >
              <div
                className="absolute inset-y-0 rounded-full bg-primary"
                style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                IN {formatSeconds(clip.startSeconds)}
              </span>
              <span>CLIP {formatSeconds(clip.durationSeconds)}</span>
              <span className="inline-flex items-center gap-1.5">
                OUT {formatSeconds(clip.endSeconds)}
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>{statusCopy.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{clip.latestJob ? `Job ${clip.latestJob.status}` : "No job snapshot"}</span>
                <span>{clampedProgress}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild variant="secondary">
                <Link href={`/videos/${clip.video.id}`}>
                  <ExternalLink aria-hidden="true" />
                  Source video
                </Link>
              </Button>
              {canUseOutput ? (
                <>
                  <Button asChild variant="outline">
                    <Link
                      href={`/api/clips/${clip.id}/stream`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Play aria-hidden="true" />
                      Preview
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/api/clips/${clip.id}/download`}>
                      <Download aria-hidden="true" />
                      Download
                    </Link>
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      {clip.status === "FAILED" && failedMessage ? (
        <section className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            {failedMessage}
          </p>
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Clip timing</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Start" value={formatSeconds(clip.startSeconds)} />
              <DetailRow label="End" value={formatSeconds(clip.endSeconds)} />
              <DetailRow label="Duration" value={formatSeconds(clip.durationSeconds)} />
              <DetailRow label="Created" value={formatDate(clip.createdAt)} />
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow
                label="Status"
                value={clip.status.charAt(0) + clip.status.slice(1).toLowerCase()}
              />
              <DetailRow label="Size" value={formatBytes(clip.sizeBytes, "Not available")} />
              <DetailRow label="Updated" value={formatDate(clip.updatedAt)} />
              <DetailRow label="File" value={canUseOutput ? "clip.mp4" : "Not available"} />
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Source video</CardTitle>
            <CardDescription>
              <Link className="text-primary hover:underline" href={`/videos/${clip.video.id}`}>
                {clip.video.title}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileVideo2 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">File</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {clip.video.fileName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDrive className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Size</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(clip.video.sizeBytes, "Not available")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Duration</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSeconds(clip.video.durationSeconds, "Not available")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Timer className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Uploaded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(clip.video.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      </AnimatedPage>
    </DashboardShell>
  );
}
