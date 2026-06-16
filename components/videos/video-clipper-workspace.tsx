"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Clock3,
  FileVideo2,
  HardDrive,
  Play,
  Scissors,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type VideoClip = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  status: string;
  createdAt: string;
};

type VideoDetail = {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: string;
  durationSeconds: number | null;
  sourceKey: string | null;
  status: string;
  createdAt: string;
  clips: VideoClip[];
};

const MIN_CLIP_SECONDS = 3;
const MAX_CLIP_SECONDS = 300;

function formatBytes(sizeBytes: string) {
  const size = Number(sizeBytes);

  if (!Number.isFinite(size) || size <= 0) {
    return "0 MB";
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

function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round((seconds % 60) * 10) / 10;
  const paddedSeconds = remainingSeconds
    .toFixed(remainingSeconds % 1 === 0 ? 0 : 1)
    .padStart(2, "0");

  return `${minutes}:${paddedSeconds}`;
}

function getStatusVariant(status: string) {
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

function parseSeconds(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return Math.round(seconds * 1000) / 1000;
}

function getClientValidationError({
  durationLimit,
  endSeconds,
  startSeconds,
}: {
  durationLimit: number | null;
  endSeconds: number | null;
  startSeconds: number | null;
}) {
  if (startSeconds === null || startSeconds < 0) {
    return "Start time must be a finite number greater than or equal to 0.";
  }

  if (endSeconds === null) {
    return "End time must be a finite number.";
  }

  if (endSeconds <= startSeconds) {
    return "End time must be greater than start time.";
  }

  const clipDuration = endSeconds - startSeconds;

  if (clipDuration < MIN_CLIP_SECONDS) {
    return "Clip duration must be at least 3 seconds.";
  }

  if (clipDuration > MAX_CLIP_SECONDS) {
    return "Clip duration must be 5 minutes or shorter.";
  }

  if (durationLimit !== null && endSeconds > durationLimit) {
    return "End time cannot be greater than the source video duration.";
  }

  return null;
}

export function VideoClipperWorkspace({ video }: { video: VideoDetail }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipRequestRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const [clipTitle, setClipTitle] = useState("");
  const [startValue, setStartValue] = useState("0");
  const [endValue, setEndValue] = useState("3");
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState<number | null>(video.durationSeconds);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startSeconds = parseSeconds(startValue);
  const endSeconds = parseSeconds(endValue);
  const durationLimit = video.durationSeconds ?? playerDuration;
  const helperError = getClientValidationError({
    durationLimit,
    endSeconds,
    startSeconds,
  });
  const selectedDuration =
    startSeconds !== null && endSeconds !== null && endSeconds > startSeconds
      ? endSeconds - startSeconds
      : 0;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clipRequestRef.current?.abort();
      clipRequestRef.current = null;
    };
  }, []);

  function setStartHere() {
    const nextValue = Math.max(videoRef.current?.currentTime ?? currentTime, 0);
    setStartValue(nextValue.toFixed(1));
    setErrorMessage(null);
  }

  function setEndHere() {
    const nextValue = Math.max(videoRef.current?.currentTime ?? currentTime, 0);
    setEndValue(nextValue.toFixed(1));
    setErrorMessage(null);
  }

  async function previewSelection() {
    if (helperError || startSeconds === null || endSeconds === null || !videoRef.current) {
      setErrorMessage(helperError ?? "Select a valid range before previewing.");
      return;
    }

    const player = videoRef.current;
    player.pause();
    player.currentTime = startSeconds;
    setIsPreviewing(true);
    setErrorMessage(null);

    try {
      await player.play();
    } catch {
      setIsPreviewing(false);
      setErrorMessage("The browser could not start the local selection preview.");
    }
  }

  async function createClip() {
    if (helperError || startSeconds === null || endSeconds === null) {
      setErrorMessage(helperError ?? "Select a valid range before creating a clip.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    clipRequestRef.current?.abort();
    const controller = new AbortController();
    clipRequestRef.current = controller;

    try {
      const response = await fetch(`/api/videos/${video.id}/clips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          endSeconds,
          startSeconds,
          title: clipTitle,
        }),
      });

      const payload = (await response.json()) as {
        clip?: { title?: string };
        errorMessage?: string;
      };

      if (!isMountedRef.current || clipRequestRef.current !== controller) {
        return;
      }

      if (!response.ok) {
        setErrorMessage(payload.errorMessage ?? "The clip job could not be created.");
        return;
      }

      setSuccessMessage(
        `${payload.clip?.title ?? "Clip"} queued. Run npm run worker:clips to process it.`,
      );
      setClipTitle("");
      router.refresh();
    } catch {
      if (!isMountedRef.current || clipRequestRef.current !== controller) {
        return;
      }

      setErrorMessage("The clip job request failed. Try again.");
    } finally {
      if (isMountedRef.current && clipRequestRef.current === controller) {
        clipRequestRef.current = null;
        setIsSubmitting(false);
      }
    }
  }

  function handleTimeUpdate() {
    const player = videoRef.current;

    if (!player) {
      return;
    }

    setCurrentTime(player.currentTime);

    if (isPreviewing && endSeconds !== null && player.currentTime >= endSeconds) {
      player.pause();
      player.currentTime = endSeconds;
      setCurrentTime(endSeconds);
      setIsPreviewing(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden shadow-panel">
          <CardContent className="p-0">
            {video.sourceKey ? (
              <video
                ref={videoRef}
                src={`/api/videos/${video.id}/stream`}
                controls
                preload="metadata"
                className="aspect-video w-full bg-black"
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;

                  if (Number.isFinite(duration)) {
                    setPlayerDuration(duration);
                  }
                }}
                onPause={() => setIsPreviewing(false)}
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-secondary/60">
                <p className="text-sm text-muted-foreground">No local source file registered.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle>Create pending clip</CardTitle>
            <CardDescription>
              Queue a clip range for npm run worker:clips.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <label htmlFor="clip-title" className="text-sm font-semibold text-foreground">
                Clip title
              </label>
              <Input
                id="clip-title"
                maxLength={120}
                placeholder={`${video.title} clip`}
                value={clipTitle}
                onChange={(event) => setClipTitle(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="start-seconds" className="text-sm font-semibold text-foreground">
                  Start time
                </label>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Input
                    id="start-seconds"
                    min={0}
                    step="0.1"
                    type="number"
                    value={startValue}
                    className="min-w-0"
                    onChange={(event) => setStartValue(event.target.value)}
                  />
                  <Button type="button" variant="secondary" className="shrink-0" onClick={setStartHere}>
                    <span className="min-[400px]:hidden">Set start</span>
                    <span className="hidden min-[400px]:inline">Set start here</span>
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="end-seconds" className="text-sm font-semibold text-foreground">
                  End time
                </label>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Input
                    id="end-seconds"
                    min={0}
                    step="0.1"
                    type="number"
                    value={endValue}
                    className="min-w-0"
                    onChange={(event) => setEndValue(event.target.value)}
                  />
                  <Button type="button" variant="secondary" className="shrink-0" onClick={setEndHere}>
                    <span className="min-[400px]:hidden">Set end</span>
                    <span className="hidden min-[400px]:inline">Set end here</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-secondary/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Timer className="size-4 text-primary" aria-hidden="true" />
                  Selection
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatSeconds(Math.max(selectedDuration, 0))}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <p>Current {formatSeconds(currentTime)}</p>
                <p>Min {MIN_CLIP_SECONDS}s</p>
                <p>Max 5m</p>
              </div>
            </div>

            {helperError ? (
              <div className="rounded-md border border-warning/35 bg-warning/10 p-3">
                <p className="text-sm leading-6 text-warning">{helperError}</p>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-md border border-destructive/35 bg-destructive/10 p-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  {errorMessage}
                </p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-md border border-primary/25 bg-primary/10 p-3">
                <p className="text-sm font-semibold text-primary">{successMessage}</p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Button type="button" variant="secondary" onClick={previewSelection}>
                <Play aria-hidden="true" />
                {isPreviewing ? "Previewing" : "Preview selection"}
              </Button>
              <Button type="button" disabled={isSubmitting} onClick={createClip}>
                <Scissors aria-hidden="true" />
                {isSubmitting ? "Creating" : "Create clip"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_0.28fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Clips from this video</CardTitle>
            <CardDescription>Pending jobs are ready for npm run worker:clips.</CardDescription>
          </CardHeader>
          <CardContent>
            {video.clips.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-secondary/35 p-5">
                <p className="text-sm font-semibold text-foreground">No clip jobs yet</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Choose a valid range, create a clip job, then run the local worker.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {video.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="rounded-md border border-border bg-secondary/40 p-4 transition-colors duration-150 hover:border-primary/20 hover:bg-secondary/55"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {clip.title}
                          </p>
                          <Badge variant={getStatusVariant(clip.status)}>{clip.status}</Badge>
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {formatSeconds(clip.startSeconds)} to {formatSeconds(clip.endSeconds)}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground sm:text-right">
                        <p>{formatSeconds(clip.durationSeconds)}</p>
                        <p className="text-xs">{formatDate(clip.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Source metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileVideo2 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">File</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {video.fileName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDrive className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Size</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatBytes(video.sizeBytes)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Duration</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {durationLimit !== null ? formatSeconds(durationLimit) : "Detected in player"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Uploaded</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(video.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
