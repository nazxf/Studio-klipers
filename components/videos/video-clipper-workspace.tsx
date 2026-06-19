"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Play,
  Scissors,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VideoClipList } from "@/components/videos/video-clip-list";
import { VideoSourceMetadata } from "@/components/videos/video-source-metadata";
import { formatSeconds } from "@/lib/formatters";
import { MAX_CLIP_TITLE_LENGTH } from "@/lib/validation";

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

const clipFormSchema = z
  .object({
    title: z
      .string()
      .max(MAX_CLIP_TITLE_LENGTH)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined)),
    startSeconds: z.string().min(1, "Required"),
    endSeconds: z.string().min(1, "Required"),
  })
  .superRefine((data, ctx) => {
    const start = Number(data.startSeconds);
    const end = Number(data.endSeconds);

    if (!Number.isFinite(start) || start < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Start time must be a finite number >= 0.",
        path: ["startSeconds"],
      });
      return;
    }

    if (!Number.isFinite(end)) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be a finite number.",
        path: ["endSeconds"],
      });
      return;
    }

    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be greater than start time.",
        path: ["endSeconds"],
      });
      return;
    }

    const duration = end - start;

    if (duration < MIN_CLIP_SECONDS) {
      ctx.addIssue({
        code: "custom",
        message: "Clip duration must be at least 3 seconds.",
        path: ["endSeconds"],
      });
      return;
    }

    if (duration > MAX_CLIP_SECONDS) {
      ctx.addIssue({
        code: "custom",
        message: "Clip duration must be 5 minutes or shorter.",
        path: ["endSeconds"],
      });
    }
  });

type ClipFormValues = z.input<typeof clipFormSchema>;



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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClipFormValues>({
    resolver: zodResolver(clipFormSchema),
    defaultValues: {
      title: "",
      startSeconds: "0",
      endSeconds: "3",
    },
    mode: "onChange",
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState<number | null>(video.durationSeconds);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startValue = watch("startSeconds");
  const endValue = watch("endSeconds");
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

  const timelineTotal = durationLimit && durationLimit > 0 ? durationLimit : null;
  const clampPct = (value: number) => Math.min(100, Math.max(0, value));
  const startPct =
    timelineTotal !== null && startSeconds !== null
      ? clampPct((startSeconds / timelineTotal) * 100)
      : null;
  const endPct =
    timelineTotal !== null && endSeconds !== null
      ? clampPct((endSeconds / timelineTotal) * 100)
      : null;
  const currentPct = timelineTotal !== null ? clampPct((currentTime / timelineTotal) * 100) : 0;
  const hasValidRange = startPct !== null && endPct !== null && endPct > startPct;

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
    setValue("startSeconds", nextValue.toFixed(1), { shouldValidate: true });
    setErrorMessage(null);
  }

  function setEndHere() {
    const nextValue = Math.max(videoRef.current?.currentTime ?? currentTime, 0);
    setValue("endSeconds", nextValue.toFixed(1), { shouldValidate: true });
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

  async function onSubmit(data: ClipFormValues) {
    const parsedStart = parseSeconds(data.startSeconds);
    const parsedEnd = parseSeconds(data.endSeconds);

    if (parsedStart === null || parsedEnd === null) {
      setErrorMessage("Select a valid range before creating a clip.");
      return;
    }

    // Extra duration-limit check (not in schema since it depends on player state)
    if (durationLimit !== null && parsedEnd > durationLimit) {
      setErrorMessage("End time cannot be greater than the source video duration.");
      return;
    }

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
          endSeconds: parsedEnd,
          startSeconds: parsedStart,
          title: data.title,
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
      reset({ title: "", startSeconds: "0", endSeconds: "3" });
      router.refresh();
    } catch {
      if (!isMountedRef.current || clipRequestRef.current !== controller) {
        return;
      }

      setErrorMessage("The clip job request failed. Try again.");
    } finally {
      if (isMountedRef.current && clipRequestRef.current === controller) {
        clipRequestRef.current = null;
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
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                Timeline
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                {timelineTotal !== null ? formatSeconds(timelineTotal) : "Detected in player"}
              </span>
            </div>
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary"
              aria-hidden="true"
            >
              {hasValidRange ? (
                <div
                  className="absolute inset-y-0 rounded-full bg-primary"
                  style={{ left: `${startPct}%`, width: `${(endPct ?? 0) - (startPct ?? 0)}%` }}
                />
              ) : null}
              <div
                className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
                style={{ left: `${currentPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                IN {startSeconds !== null ? formatSeconds(startSeconds) : "--"}
              </span>
              <span>CLIP {formatSeconds(Math.max(selectedDuration, 0))}</span>
              <span className="inline-flex items-center gap-1.5">
                OUT {endSeconds !== null ? formatSeconds(endSeconds) : "--"}
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              </span>
            </div>
          </div>
        </Card>

        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle>Create pending clip</CardTitle>
            <CardDescription>
              Queue a clip range for npm run worker:clips.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-2">
                <label htmlFor="clip-title" className="text-sm font-semibold text-foreground">
                  Clip title
                </label>
                <Input
                  id="clip-title"
                  maxLength={120}
                  placeholder={`${video.title} clip`}
                  {...register("title")}
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
                      inputMode="decimal"
                      className="min-w-0"
                      aria-invalid={errors.startSeconds ? true : undefined}
                      aria-describedby={errors.startSeconds ? "start-seconds-error" : undefined}
                      {...register("startSeconds")}
                    />
                    <Button type="button" variant="secondary" className="shrink-0" onClick={setStartHere}>
                      <span className="min-[400px]:hidden">Set start</span>
                      <span className="hidden min-[400px]:inline">Set start here</span>
                    </Button>
                  </div>
                  {errors.startSeconds ? (
                    <p id="start-seconds-error" role="alert" className="text-xs text-destructive">
                      {errors.startSeconds.message}
                    </p>
                  ) : null}
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
                      inputMode="decimal"
                      className="min-w-0"
                      aria-invalid={errors.endSeconds ? true : undefined}
                      aria-describedby={errors.endSeconds ? "end-seconds-error" : undefined}
                      {...register("endSeconds")}
                    />
                    <Button type="button" variant="secondary" className="shrink-0" onClick={setEndHere}>
                      <span className="min-[400px]:hidden">Set end</span>
                      <span className="hidden min-[400px]:inline">Set end here</span>
                    </Button>
                  </div>
                  {errors.endSeconds ? (
                    <p id="end-seconds-error" role="alert" className="text-xs text-destructive">
                      {errors.endSeconds.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-border bg-secondary/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Timer className="size-4 text-primary" aria-hidden="true" />
                    Selection
                  </p>
                  <span className="font-mono text-xs text-muted-foreground">
                    Min {MIN_CLIP_SECONDS}s · Max 5m
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Start",
                      value: startSeconds !== null ? formatSeconds(startSeconds) : "--",
                    },
                    {
                      label: "End",
                      value: endSeconds !== null ? formatSeconds(endSeconds) : "--",
                    },
                    { label: "Length", value: formatSeconds(Math.max(selectedDuration, 0)) },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-md border border-border/70 bg-background/40 p-2.5 text-center"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
                        {stat.label}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Current {formatSeconds(currentTime)}
                </p>
              </div>

              {helperError ? (
                <div role="status" className="rounded-md border border-warning/35 bg-warning/10 p-3">
                  <p className="text-sm leading-6 text-warning">{helperError}</p>
                </div>
              ) : null}

              {errorMessage ? (
                <div role="alert" className="rounded-md border border-destructive/35 bg-destructive/10 p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    {errorMessage}
                  </p>
                </div>
              ) : null}

              {successMessage ? (
                <div role="status" className="rounded-md border border-primary/25 bg-primary/10 p-3">
                  <p className="text-sm font-semibold text-primary">{successMessage}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Button type="button" variant="secondary" onClick={previewSelection}>
                  <Play aria-hidden="true" />
                  {isPreviewing ? "Previewing" : "Preview selection"}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Scissors aria-hidden="true" />
                  {isSubmitting ? "Creating" : "Create clip"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_0.28fr]">
        <VideoClipList clips={video.clips} />
        <VideoSourceMetadata
          fileName={video.fileName}
          sizeBytes={video.sizeBytes}
          durationSeconds={video.durationSeconds}
          createdAt={video.createdAt}
        />
      </section>
    </div>
  );
}
