import { stat } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { probeMp4DurationSeconds } from "@/server/media-toolchain";
import { resolveLocalUploadKey } from "@/server/storage";

/**
 * Best-effort auto-probe: when a video has no durationSeconds but does have a
 * sourceKey pointing to a local file, run ffprobe and persist the result.
 * Returns the detected duration or null if anything fails.
 */
async function tryAutoProbe(videoId: string, sourceKey: string): Promise<number | null> {
  try {
    const filePath = resolveLocalUploadKey(sourceKey);
    const fileStat = await stat(filePath);

    if (!fileStat.isFile() || fileStat.size <= 0) {
      return null;
    }

    const durationSeconds = await probeMp4DurationSeconds(filePath);

    await prisma.video.update({
      data: { durationSeconds },
      where: { id: videoId },
    });

    return durationSeconds;
  } catch {
    return null;
  }
}

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

  // Auto-probe duration if missing but source file exists
  let { durationSeconds } = video;

  if (durationSeconds === null && video.sourceKey) {
    durationSeconds = await tryAutoProbe(video.id, video.sourceKey);
  }

  return {
    id: video.id,
    title: video.title,
    fileName: video.fileName,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes.toString(),
    durationSeconds,
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
