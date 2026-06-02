import { prisma } from "@/lib/prisma";

export async function listVideosForUser(userId: string) {
  const videos = await prisma.video.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      durationSeconds: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          clips: true,
        },
      },
    },
  });

  return videos.map((video) => ({
    id: video.id,
    title: video.title,
    fileName: video.fileName,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes.toString(),
    durationSeconds: video.durationSeconds,
    status: video.status,
    createdAt: video.createdAt.toISOString(),
    clipCount: video._count.clips,
  }));
}
