import { stat } from "node:fs/promises";

import { CaptionRenderStatus, ClipStatus, JobType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSafeClipProcessingErrorMessage } from "@/server/clip-errors";
import {
  getLocalCaptionRenderOutputKey,
  resolveLocalUploadKey,
} from "@/server/storage";

export type ResolvedCaptionRenderOutput = {
  filePath: string;
  fileSize: number;
  outputKey: string;
  renderId: string;
  title: string;
};

export async function getLatestCaptionRenderForCompletedClipForUser({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}) {
  const render = await prisma.captionRender.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      completedAt: true,
      createdAt: true,
      errorMessage: true,
      id: true,
      processingJobs: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          progress: true,
          status: true,
          type: true,
        },
        take: 1,
        where: {
          type: JobType.BURN_CAPTIONS,
        },
      },
      sizeBytes: true,
      startedAt: true,
      status: true,
      updatedAt: true,
    },
    where: {
      clip: {
        id: clipId,
        status: ClipStatus.COMPLETED,
        userId,
      },
      clipId,
      userId,
    },
  });

  if (!render) {
    return null;
  }

  return {
    completedAt: render.completedAt?.toISOString() ?? null,
    createdAt: render.createdAt.toISOString(),
    errorMessage: render.errorMessage
      ? getSafeClipProcessingErrorMessage(render.errorMessage)
      : null,
    id: render.id,
    latestJob: render.processingJobs[0]
      ? {
          id: render.processingJobs[0].id,
          progress: render.processingJobs[0].progress,
          status: render.processingJobs[0].status,
          type: render.processingJobs[0].type,
        }
      : null,
    sizeBytes: render.sizeBytes?.toString() ?? null,
    startedAt: render.startedAt?.toISOString() ?? null,
    status: render.status,
    updatedAt: render.updatedAt.toISOString(),
  };
}

export async function resolveCompletedCaptionRenderOutputForUser({
  clipId,
  renderId,
  userId,
}: {
  clipId: string;
  renderId: string;
  userId: string;
}): Promise<ResolvedCaptionRenderOutput | null> {
  const render = await prisma.captionRender.findFirst({
    select: {
      clip: {
        select: {
          title: true,
        },
      },
      clipId: true,
      id: true,
      outputKey: true,
      status: true,
      userId: true,
    },
    where: {
      clip: {
        id: clipId,
        status: ClipStatus.COMPLETED,
        userId,
      },
      clipId,
      id: renderId,
      userId,
    },
  });

  if (
    !render ||
    render.status !== CaptionRenderStatus.COMPLETED ||
    !render.outputKey
  ) {
    return null;
  }

  const expectedOutputKey = getLocalCaptionRenderOutputKey({
    clipId: render.clipId,
    renderId: render.id,
    userId: render.userId,
  });

  if (render.outputKey !== expectedOutputKey) {
    return null;
  }

  let filePath: string;

  try {
    filePath = resolveLocalUploadKey(render.outputKey);
  } catch {
    return null;
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile() || fileStat.size <= 0) {
      return null;
    }

    return {
      filePath,
      fileSize: fileStat.size,
      outputKey: render.outputKey,
      renderId: render.id,
      title: render.clip.title,
    };
  } catch {
    return null;
  }
}

export function getCaptionRenderDownloadFileName({
  renderId,
  title,
}: {
  renderId: string;
  title: string;
}) {
  const safeTitle = title
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  const baseName = safeTitle || `caption-render-${renderId}`;
  const captionedName = baseName.toLowerCase().endsWith(".mp4")
    ? baseName.replace(/\.mp4$/i, "-captioned")
    : `${baseName}-captioned`;

  return `${captionedName}.mp4`;
}
