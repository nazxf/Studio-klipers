"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Download, Film, Loader2, Play, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CaptionRender = {
  completedAt: string | null;
  errorMessage: string | null;
  id: string;
  latestJob: {
    progress: number;
    status: string;
  } | null;
  sizeBytes: string | null;
  status: string;
};

function getRenderStatusVariant(status: string) {
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

export function CaptionRenderPanel({
  canCreate,
  clipId,
  render,
}: {
  canCreate: boolean;
  clipId: string;
  render: CaptionRender | null;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isActiveRender = render?.status === "PENDING" || render?.status === "PROCESSING";
  const progress =
    render?.latestJob?.progress ??
    (render?.status === "COMPLETED" ? 100 : render?.status === "PROCESSING" ? 10 : 0);
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  async function createRender() {
    if (!canCreate || isCreating || isActiveRender) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      const response = await fetch(`/api/clips/${clipId}/caption-renders`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        errorMessage?: string;
      };

      if (!response.ok) {
        throw new Error(payload.errorMessage ?? "Captioned render could not be queued.");
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Captioned render could not be queued.";

      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card className="mt-6 shadow-none">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>Caption render</CardTitle>
          <CardDescription>Create a separate MP4 with captions burned in.</CardDescription>
        </div>
        {render ? (
          <Badge variant={getRenderStatusVariant(render.status)}>
            <Film aria-hidden="true" />
            {render.status}
          </Badge>
        ) : (
          <Badge variant="outline">No render</Badge>
        )}
      </CardHeader>
      <CardContent>
        {render ? (
          <div className="rounded-md border border-border bg-secondary/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Latest captioned MP4</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {render.status === "COMPLETED"
                    ? `Ready to preview and download. Size: ${formatBytes(render.sizeBytes)}.`
                    : render.status === "FAILED"
                      ? "The last render failed."
                      : "Waiting for the local caption render worker."}
                </p>
              </div>
              {render.status === "COMPLETED" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/api/clips/${clipId}/caption-renders/${render.id}/stream`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Play aria-hidden="true" />
                      Preview
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/api/clips/${clipId}/caption-renders/${render.id}/download`}>
                      <Download aria-hidden="true" />
                      Download
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

            {render.status === "PENDING" || render.status === "PROCESSING" ? (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${clampedProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-warning">
                  Run npm run worker:caption-renders to process this captioned MP4.
                </p>
              </div>
            ) : null}

            {render.status === "FAILED" ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertCircle className="size-4" aria-hidden="true" />
                {render.errorMessage ?? "Caption render failed."}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-secondary/35 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              No captioned render yet
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canCreate ? (
            <Button
              type="button"
              disabled={isCreating || isActiveRender}
              onClick={createRender}
            >
              {isCreating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Film aria-hidden="true" />}
              {isCreating ? "Queueing" : "Create captioned MP4"}
            </Button>
          ) : null}
          {!canCreate ? (
            <p className="text-sm text-muted-foreground">
              A READY subtitle track with at least one segment is required.
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="mt-3 text-sm font-semibold text-destructive">{errorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
