import { prisma } from "@/lib/prisma";
import { getSafeClipProcessingErrorMessage } from "@/server/clip-errors";

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
      outputKey: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
      video: {
        select: {
          id: true,
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
    hasOutput: Boolean(clip.outputKey),
    sizeBytes: clip.sizeBytes?.toString() ?? null,
    status: clip.status,
    createdAt: clip.createdAt.toISOString(),
    videoId: clip.video.id,
    videoTitle: clip.video.title,
    videoFileName: clip.video.fileName,
  }));
}

export async function getClipForUser({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}) {
  const clip = await prisma.clip.findFirst({
    where: {
      id: clipId,
      userId,
    },
    select: {
      id: true,
      title: true,
      startSeconds: true,
      endSeconds: true,
      durationSeconds: true,
      status: true,
      outputKey: true,
      sizeBytes: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
      processingJobs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          progress: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          updatedAt: true,
        },
      },
      video: {
        select: {
          id: true,
          title: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          durationSeconds: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!clip) {
    return null;
  }

  const latestJob = clip.processingJobs[0] ?? null;

  return {
    id: clip.id,
    title: clip.title,
    startSeconds: clip.startSeconds,
    endSeconds: clip.endSeconds,
    durationSeconds: clip.durationSeconds,
    status: clip.status,
    hasOutput: Boolean(clip.outputKey),
    sizeBytes: clip.sizeBytes?.toString() ?? null,
    errorMessage: clip.errorMessage
      ? getSafeClipProcessingErrorMessage(clip.errorMessage)
      : null,
    createdAt: clip.createdAt.toISOString(),
    updatedAt: clip.updatedAt.toISOString(),
    latestJob: latestJob
      ? {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          errorMessage: latestJob.errorMessage
            ? getSafeClipProcessingErrorMessage(latestJob.errorMessage)
            : null,
          startedAt: latestJob.startedAt?.toISOString() ?? null,
          completedAt: latestJob.completedAt?.toISOString() ?? null,
          updatedAt: latestJob.updatedAt.toISOString(),
        }
      : null,
    video: {
      id: clip.video.id,
      title: clip.video.title,
      fileName: clip.video.fileName,
      mimeType: clip.video.mimeType,
      sizeBytes: clip.video.sizeBytes.toString(),
      durationSeconds: clip.video.durationSeconds,
      status: clip.video.status,
      createdAt: clip.video.createdAt.toISOString(),
    },
  };
}
