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

import { CaptionPresetSelector } from "@/components/clips/caption-preset-selector";
import { CaptionRenderPanel } from "@/components/clips/caption-render-panel";
import { ClipSubtitlePreview } from "@/components/clips/clip-subtitle-preview";
import { ClipStatusRefresh } from "@/components/clips/clip-status-refresh";
import { SubtitleEditor } from "@/components/clips/subtitle-editor";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { DEFAULT_CAPTION_PRESET_KEY } from "@/lib/caption-presets";
import { getLatestCaptionRenderForCompletedClipForUser } from "@/server/caption-renders";
import { requireCurrentUser } from "@/server/current-user";
import { getClipForUser } from "@/server/clips";
import { getSubtitleTrackForCompletedClipForUser } from "@/server/subtitles";

function formatBytes(sizeBytes: string | null) {
  if (!sizeBytes) {
    return "Not available";
  }

  const size = Number(sizeBytes);

  if (!Number.isFinite(size) || size <= 0) {
    return "Not available";
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

function formatSeconds(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "Not available";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round((seconds % 60) * 10) / 10;
  const paddedSeconds = remainingSeconds
    .toFixed(remainingSeconds % 1 === 0 ? 0 : 1)
    .padStart(2, "0");

  return `${minutes}:${paddedSeconds}`;
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
    description: "This clip is waiting for npm run worker:clips.",
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[68%] text-right text-sm font-semibold text-foreground">{value}</dd>
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
  const subtitleTrack = await getSubtitleTrackForCompletedClipForUser({
    clipId: id,
    userId: user.id,
  });
  const latestCaptionRender = await getLatestCaptionRenderForCompletedClipForUser({
    clipId: id,
    userId: user.id,
  });

  if (!clip) {
    notFound();
  }

  const shouldRefreshClip = clip.status === "PENDING" || clip.status === "PROCESSING";
  const shouldRefreshSubtitles =
    subtitleTrack?.status === "PENDING" || subtitleTrack?.status === "PROCESSING";
  const shouldRefreshCaptionRender =
    latestCaptionRender?.status === "PENDING" || latestCaptionRender?.status === "PROCESSING";
  const isRefreshing = shouldRefreshClip || shouldRefreshSubtitles || shouldRefreshCaptionRender;
  const canUseOutput = clip.status === "COMPLETED" && clip.hasOutput;
  const statusCopy = getStatusCopy(clip.status);
  const progress =
    clip.latestJob?.progress ??
    (clip.status === "COMPLETED" ? 100 : clip.status === "PROCESSING" ? 10 : 0);
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const failedMessage = clip.errorMessage ?? clip.latestJob?.errorMessage;
  const activeCaptionPresetKey = subtitleTrack?.presetKey ?? DEFAULT_CAPTION_PRESET_KEY;
  const canCreateCaptionRender =
    subtitleTrack?.status === "READY" && subtitleTrack.segments.length > 0;

  return (
    <DashboardShell user={user}>
      <ClipStatusRefresh enabled={isRefreshing} />

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
        <Badge variant={getClipStatusVariant(clip.status)}>{clip.status}</Badge>
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
              <ClipSubtitlePreview
                videoSrc={`/api/clips/${clip.id}/stream`}
                presetKey={activeCaptionPresetKey}
                segments={subtitleTrack?.status === "READY" ? subtitleTrack.segments : []}
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

      {canUseOutput && subtitleTrack ? (
        <CaptionPresetSelector
          activePresetKey={activeCaptionPresetKey}
          clipId={clip.id}
        />
      ) : null}

      {canUseOutput ? <SubtitleEditor clipId={clip.id} track={subtitleTrack} /> : null}

      {canUseOutput ? (
        <CaptionRenderPanel
          canCreate={canCreateCaptionRender}
          clipId={clip.id}
          render={latestCaptionRender}
        />
      ) : null}

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
              <DetailRow label="Status" value={clip.status} />
              <DetailRow label="Size" value={formatBytes(clip.sizeBytes)} />
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
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {clip.video.fileName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDrive className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Size</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatBytes(clip.video.sizeBytes)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Duration</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSeconds(clip.video.durationSeconds)}
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
    </DashboardShell>
  );
}
