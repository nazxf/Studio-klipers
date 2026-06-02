import Link from "next/link";
import { FileVideo2, UploadCloud } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/server/current-user";
import { listVideosForUser } from "@/server/videos";

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

function getVideoStatusVariant(status: string) {
  if (status === "READY") {
    return "success";
  }

  if (status === "FAILED") {
    return "error";
  }

  return "secondary";
}

export default async function VideosPage() {
  const user = await requireCurrentUser("/videos");
  const videos = await listVideosForUser(user.id);

  return (
    <DashboardShell user={user}>
      <PageHeader
        eyebrow="Sources"
        title="Videos"
        description="Source video records stored for your authenticated workspace."
        action={
          <Button asChild>
            <Link href="/upload">
              <UploadCloud aria-hidden="true" />
              Local upload
            </Link>
          </Button>
        }
      />

      <section className="mt-8">
        {videos.length === 0 ? (
          <EmptyState
            icon={FileVideo2}
            title="No source videos yet"
            description="Local development MP4 uploads will appear here after their metadata is saved to PostgreSQL."
            action={
              <Button asChild variant="secondary">
                <Link href="/upload">
                  <UploadCloud aria-hidden="true" />
                  Upload local MP4
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {videos.map((video) => (
              <Link key={video.id} href={`/videos/${video.id}`} className="block">
                <Card className="shadow-none transition-colors duration-150 hover:border-primary/20 hover:bg-card/90">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                        <FileVideo2 className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-foreground">
                            {video.title}
                          </h2>
                          <Badge variant={getVideoStatusVariant(video.status)}>{video.status}</Badge>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                          {video.fileName}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:min-w-80 sm:grid-cols-3 sm:text-right">
                      <p>{formatBytes(video.sizeBytes)}</p>
                      <p>{video.clipCount} clips</p>
                      <p>{formatDate(video.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
