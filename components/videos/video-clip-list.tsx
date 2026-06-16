"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatSeconds } from "@/lib/formatters";
import { getClipStatusVariant } from "@/lib/status-helpers";

type VideoClip = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  status: string;
  createdAt: string;
};

export function VideoClipList({ clips }: { clips: VideoClip[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Clips from this video</CardTitle>
        <CardDescription>Pending jobs are ready for npm run worker:clips.</CardDescription>
      </CardHeader>
      <CardContent>
        {clips.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/35 p-5">
            <p className="text-sm font-semibold text-foreground">No clip jobs yet</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Choose a valid range, create a clip job, then run the local worker.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {clips.map((clip) => (
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
                      <Badge variant={getClipStatusVariant(clip.status)}>{clip.status}</Badge>
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
  );
}
