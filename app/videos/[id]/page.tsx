import { notFound } from "next/navigation";
import { HardDrive, Scissors } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { VideoClipperWorkspace } from "@/components/videos/video-clipper-workspace";
import { requireCurrentUser } from "@/server/current-user";
import { getVideoForUser } from "@/server/video-detail";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser(`/videos/${id}`);
  const video = await getVideoForUser({ userId: user.id, videoId: id });

  if (!video) {
    notFound();
  }

  return (
    <DashboardShell user={user}>
      <PageHeader
        eyebrow="Clipper workspace"
        title={video.title}
        description="Preview the protected local source, mark a range, and queue a pending clip job for the future worker."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{video.status}</Badge>
        <Badge variant="outline">
          <HardDrive aria-hidden="true" />
          Local storage
        </Badge>
        <Badge variant="outline">
          <Scissors aria-hidden="true" />
          {video.clipCount} clips
        </Badge>
      </div>

      <VideoClipperWorkspace video={video} />
    </DashboardShell>
  );
}
