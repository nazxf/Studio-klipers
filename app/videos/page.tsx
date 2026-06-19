import Link from "next/link";
import { ArrowUpRight, FileVideo2, HardDrive, Scissors, UploadCloud } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnimatedPage } from "@/components/motion/animated-page";
import { StaggeredList, StaggeredItem } from "@/components/motion/staggered-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SummaryTile } from "@/components/shared/summary-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBytes, formatDate, formatSeconds } from "@/lib/formatters";
import { requireCurrentUser } from "@/server/current-user";
import { listVideosForUser } from "@/server/videos";

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default async function VideosPage() {
  const user = await requireCurrentUser("/videos");
  const videos = await listVideosForUser(user.id);

  const totalClips = videos.reduce((acc, video) => acc + video.clipCount, 0);
  const totalBytes = videos.reduce((acc, video) => acc + Number(video.sizeBytes), 0);

  return (
    <DashboardShell user={user}>
      <AnimatedPage>
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

        {videos.length === 0 ? (
          <section className="mt-8">
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
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <SummaryTile icon={FileVideo2} label="Sources" value={String(videos.length)} accent />
              <SummaryTile icon={Scissors} label="Clips" value={String(totalClips)} />
              <SummaryTile icon={HardDrive} label="Storage" value={formatBytes(totalBytes)} />
            </section>

            <StaggeredList className="mt-6 grid gap-4">
              {videos.map((video) => (
                <StaggeredItem key={video.id}>
                  <Link
                    href={`/videos/${video.id}`}
                    className="group block rounded-lg focus-visible:outline-none"
                  >
                    <Card className="shadow-none transition-colors duration-150 group-hover:border-primary/25 group-hover:bg-card/90 group-focus-visible:border-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                      <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                            <FileVideo2 className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-sm font-semibold text-foreground">
                                {video.title}
                              </h2>
                              <StatusBadge kind="video" status={video.status} />
                            </div>
                            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                              {video.fileName}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:w-[34rem] lg:shrink-0">
                          <MetaCell
                            label="Duration"
                            value={formatSeconds(video.durationSeconds, "—")}
                          />
                          <MetaCell label="Size" value={formatBytes(video.sizeBytes)} />
                          <MetaCell label="Clips" value={String(video.clipCount)} />
                          <MetaCell label="Uploaded" value={formatDate(video.createdAt)} />
                        </div>

                        <ArrowUpRight
                          className="hidden size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary lg:block"
                          aria-hidden="true"
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </StaggeredItem>
              ))}
            </StaggeredList>
          </>
        )}
      </AnimatedPage>
    </DashboardShell>
  );
}
