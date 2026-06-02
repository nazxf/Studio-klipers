import { prisma } from "@/lib/prisma";

export async function listClipsForUser(userId: string) {
  const clips = await prisma.clip.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      startSeconds: true,
      endSeconds: true,
      durationSeconds: true,
      status: true,
      createdAt: true,
      video: {
        select: {
          title: true,
          fileName: true,
        },
      },
    },
  });

  return clips.map((clip) => ({
    id: clip.id,
    title: clip.title,
    startSeconds: clip.startSeconds,
    endSeconds: clip.endSeconds,
    durationSeconds: clip.durationSeconds,
    status: clip.status,
    createdAt: clip.createdAt.toISOString(),
    videoTitle: clip.video.title,
    videoFileName: clip.video.fileName,
  }));
}
