import { prisma } from "@/lib/prisma";

export async function getVideoForUser({
  userId,
  videoId,
}: {
  userId: string;
  videoId: string;
}) {
  const video = await prisma.video.findFirst({
    where: {
      id: videoId,
      userId,
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      durationSeconds: true,
      sourceKey: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      clips: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          startSeconds: true,
          endSeconds: true,
          durationSeconds: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          clips: true,
          processingJobs: true,
        },
      },
    },
  });

  if (!video) {
    return null;
  }

  return {
    id: video.id,
    title: video.title,
    fileName: video.fileName,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes.toString(),
    durationSeconds: video.durationSeconds,
    sourceKey: video.sourceKey,
    status: video.status,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    clips: video.clips.map((clip) => ({
      id: clip.id,
      title: clip.title,
      startSeconds: clip.startSeconds,
      endSeconds: clip.endSeconds,
      durationSeconds: clip.durationSeconds,
      status: clip.status,
      createdAt: clip.createdAt.toISOString(),
    })),
    clipCount: video._count.clips,
    processingJobCount: video._count.processingJobs,
  };
}
