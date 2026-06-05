"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ClosedCaption, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_TEXT_LENGTH = 500;

type SubtitleSegment = {
  endSeconds: number;
  generatedText: string | null;
  id: string;
  isEdited: boolean;
  sortOrder: number;
  startSeconds: number;
  text: string;
  updatedAt: string;
};

type SubtitleTrack = {
  errorMessage: string | null;
  generatedAt: string | null;
  id: string;
  languageCode: string | null;
  modelName: string | null;
  segments: SubtitleSegment[];
  status: string;
};

type SegmentState = SubtitleSegment & {
  errorMessage: string | null;
  isSaving: boolean;
  savedText: string;
};

function createSegmentState(segment: SubtitleSegment): SegmentState {
  return {
    ...segment,
    errorMessage: null,
    isSaving: false,
    savedText: segment.text,
  };
}

function getTrackSyncKey(track: SubtitleTrack | null) {
  if (!track) {
    return "no-track";
  }

  const segmentSignature = track.segments
    .map((segment) => `${segment.id}:${segment.updatedAt}`)
    .join("|");

  return `${track.id}:${track.status}:${track.segments.length}:${segmentSignature}`;
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

function getTrackStatusVariant(status: string) {
  if (status === "READY") {
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

function getTrackCopy(track: SubtitleTrack | null) {
  if (!track) {
    return {
      description: "Generate subtitles from the completed clip output before editing.",
      title: "No subtitles yet",
    };
  }

  if (track.status === "READY") {
    return {
      description: "Review generated text and save edits one segment at a time.",
      title: "Subtitle text",
    };
  }

  if (track.status === "PROCESSING") {
    return {
      description: "The local subtitle worker is transcribing this completed clip.",
      title: "Subtitles processing",
    };
  }

  if (track.status === "FAILED") {
    return {
      description: track.errorMessage ?? "Subtitle generation failed. Retry from the backend route.",
      title: "Subtitle generation failed",
    };
  }

  return {
    description: "Subtitle generation is queued for npm run worker:subtitles.",
    title: "Subtitles queued",
  };
}

export function SubtitleEditor({
  clipId,
  track,
}: {
  clipId: string;
  track: SubtitleTrack | null;
}) {
  const [segments, setSegments] = useState<SegmentState[]>(
    () => track?.segments.map(createSegmentState) ?? [],
  );
  const trackCopy = getTrackCopy(track);
  const trackSyncKey = getTrackSyncKey(track);
  const orderedSegments = useMemo(
    () =>
      [...segments].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.startSeconds - right.startSeconds,
      ),
    [segments],
  );

  useEffect(() => {
    const nextSegments = track?.segments.map(createSegmentState) ?? [];

    const syncTimer = window.setTimeout(() => {
      setSegments((currentSegments) => {
        const hasDirtyDrafts = currentSegments.some(
          (segment) => segment.isSaving || segment.text !== segment.savedText,
        );

        if (hasDirtyDrafts) {
          return currentSegments;
        }

        return nextSegments;
      });
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [track, trackSyncKey]);

  function updateDraft(segmentId: string, text: string) {
    setSegments((currentSegments) =>
      currentSegments.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              errorMessage: null,
              text,
            }
          : segment,
      ),
    );
  }

  async function saveSegment(segment: SegmentState) {
    const cleanText = segment.text.replace(/\s+/g, " ").trim();

    if (!cleanText || cleanText.length > MAX_TEXT_LENGTH) {
      setSegments((currentSegments) =>
        currentSegments.map((currentSegment) =>
          currentSegment.id === segment.id
            ? {
                ...currentSegment,
                errorMessage: `Subtitle text must be 1-${MAX_TEXT_LENGTH} characters.`,
              }
            : currentSegment,
        ),
      );
      return;
    }

    setSegments((currentSegments) =>
      currentSegments.map((currentSegment) =>
        currentSegment.id === segment.id
          ? {
              ...currentSegment,
              errorMessage: null,
              isSaving: true,
            }
          : currentSegment,
      ),
    );

    try {
      const response = await fetch(
        `/api/clips/${clipId}/subtitles/segments/${segment.id}`,
        {
          body: JSON.stringify({
            text: cleanText,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );
      const payload = (await response.json()) as {
        errorMessage?: string;
        segment?: {
          id: string;
          isEdited: boolean;
          text: string;
          updatedAt: string;
        };
      };

      if (!response.ok || !payload.segment) {
        throw new Error(payload.errorMessage ?? "Subtitle text could not be saved.");
      }

      setSegments((currentSegments) =>
        currentSegments.map((currentSegment) =>
          currentSegment.id === segment.id
            ? {
                ...currentSegment,
                errorMessage: null,
                isEdited: payload.segment!.isEdited,
                isSaving: false,
                savedText: payload.segment!.text,
                text: payload.segment!.text,
                updatedAt: payload.segment!.updatedAt,
              }
            : currentSegment,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subtitle text could not be saved.";

      setSegments((currentSegments) =>
        currentSegments.map((currentSegment) =>
          currentSegment.id === segment.id
            ? {
                ...currentSegment,
                errorMessage: message,
                isSaving: false,
              }
            : currentSegment,
        ),
      );
    }
  }

  return (
    <Card className="mt-6 shadow-none">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>{trackCopy.title}</CardTitle>
          <CardDescription>{trackCopy.description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {track ? (
            <>
              <Badge variant={getTrackStatusVariant(track.status)}>{track.status}</Badge>
              {track.languageCode ? <Badge variant="outline">{track.languageCode}</Badge> : null}
              {track.modelName ? <Badge variant="outline">{track.modelName}</Badge> : null}
            </>
          ) : (
            <Badge variant="outline">No track</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!track ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/35 p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClosedCaption className="size-4 text-muted-foreground" aria-hidden="true" />
              No generated subtitle track
            </p>
          </div>
        ) : null}

        {track?.status === "FAILED" ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              {track.errorMessage ?? "Subtitle generation failed."}
            </p>
          </div>
        ) : null}

        {track && (track.status === "PENDING" || track.status === "PROCESSING") ? (
          <div className="rounded-md border border-warning/35 bg-warning/10 p-4">
            <p className="text-sm leading-6 text-warning">
              {track.status === "PENDING"
                ? "Run npm run worker:subtitles to process this subtitle job."
                : "The subtitle worker is processing this clip. Refresh shortly."}
            </p>
          </div>
        ) : null}

        {track?.status === "READY" ? (
          orderedSegments.length > 0 ? (
            <div className="grid gap-3">
              {orderedSegments.map((segment) => {
                const isDirty = segment.text !== segment.savedText;
                const canSave =
                  isDirty &&
                  !segment.isSaving &&
                  segment.text.replace(/\s+/g, " ").trim().length > 0 &&
                  segment.text.replace(/\s+/g, " ").trim().length <= MAX_TEXT_LENGTH;

                return (
                  <div
                    key={segment.id}
                    className="rounded-md border border-border bg-secondary/35 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatSeconds(segment.startSeconds)} to{" "}
                          {formatSeconds(segment.endSeconds)}
                        </span>
                        {segment.isEdited ? (
                          <Badge variant="outline">
                            <Check aria-hidden="true" />
                            Edited
                          </Badge>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canSave}
                        onClick={() => saveSegment(segment)}
                      >
                        <Save aria-hidden="true" />
                        {segment.isSaving ? "Saving" : "Save"}
                      </Button>
                    </div>
                    <label className="mt-3 block">
                      <span className="sr-only">Subtitle text</span>
                      <textarea
                        maxLength={MAX_TEXT_LENGTH}
                        value={segment.text}
                        className="min-h-20 w-full resize-y rounded-md border border-input bg-background/60 px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        onChange={(event) => updateDraft(segment.id, event.target.value)}
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{segment.text.length}/{MAX_TEXT_LENGTH}</span>
                      <span>Timing locked</span>
                    </div>
                    {segment.errorMessage ? (
                      <p className="mt-2 text-sm font-semibold text-destructive">
                        {segment.errorMessage}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-secondary/35 p-5">
              <p className="text-sm font-semibold text-foreground">No spoken segments detected</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The track is ready, but the transcription worker did not find subtitle text.
              </p>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
