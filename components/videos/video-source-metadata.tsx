"use client";

import { CalendarClock, Clock3, FileVideo2, HardDrive } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDate, formatSeconds } from "@/lib/formatters";

type VideoSourceMetadataProps = {
  fileName: string;
  sizeBytes: string;
  durationSeconds: number | null;
  createdAt: string;
};

export function VideoSourceMetadata({
  fileName,
  sizeBytes,
  durationSeconds,
  createdAt,
}: VideoSourceMetadataProps) {
  return (
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
              {fileName}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Size</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatBytes(sizeBytes)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Duration</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {durationSeconds !== null ? formatSeconds(durationSeconds) : "Detected in player"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Uploaded</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(createdAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
