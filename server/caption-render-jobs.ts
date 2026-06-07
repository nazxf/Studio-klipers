import {
  CaptionRenderStatus,
  ClipStatus,
  JobStatus,
  JobType,
  Prisma,
  SubtitleTrackStatus,
} from "@prisma/client";

import {
  getCaptionPresetStyleSnapshot,
  normalizeCaptionPresetKey,
} from "@/lib/caption-presets";
import { prisma } from "@/lib/prisma";
import { resolveCompletedClipOutputForUser } from "@/server/clip-files";

const VALID_CAPTION_RENDER_JOB_ERROR_CODES = new Set([
  "clip_not_found",
  "clip_not_ready",
  "clip_output_unavailable",
  "subtitles_not_ready",
  "no_subtitle_segments",
]);

type CaptionRenderSegmentSnapshot = {
  endSeconds: number;
  id: string;
  isEdited: boolean;
  sortOrder: number;
  startSeconds: number;
  text: string;
  updatedAt: string;
};

export class CaptionRenderJobValidationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function getCaptionRenderJobValidationMessage(errorCode?: string) {
  if (!errorCode || !VALID_CAPTION_RENDER_JOB_ERROR_CODES.has(errorCode)) {
    return null;
  }

  const messages: Record<string, string> = {
    clip_not_found: "The clip was not found for this workspace.",
    clip_not_ready: "Only completed clips can create captioned renders.",
    clip_output_unavailable: "The completed clip output is not available.",
    no_subtitle_segments: "Add at least one subtitle segment before rendering captions.",
    subtitles_not_ready: "Generate subtitles before creating a captioned render.",
  };

  return messages[errorCode];
}

function serializeJob(job: {
  id: string;
  progress: number;
  status: JobStatus;
  type: JobType;
}) {
  return {
    id: job.id,
    progress: job.progress,
    status: job.status,
    type: job.type,
  };
}

function serializeRender(render: {
  id: string;
  status: CaptionRenderStatus;
}) {
  return {
    id: render.id,
    status: render.status,
  };
}

function isRetryableCaptionRenderJobWriteError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

function buildSegmentsSnapshot(
  segments: Array<{
    endSeconds: number;
    id: string;
    isEdited: boolean;
    sortOrder: number;
    startSeconds: number;
    text: string;
    updatedAt: Date;
  }>,
) {
  const snapshot: CaptionRenderSegmentSnapshot[] = [];

  for (const segment of segments) {
    const cleanText = segment.text.replace(/\s+/g, " ").trim();

    if (!cleanText) {
      continue;
    }

    if (
      !Number.isFinite(segment.startSeconds) ||
      !Number.isFinite(segment.endSeconds) ||
      segment.startSeconds < 0 ||
      segment.endSeconds <= segment.startSeconds
    ) {
      continue;
    }

    snapshot.push({
      endSeconds: Math.round(segment.endSeconds * 1000) / 1000,
      id: segment.id,
      isEdited: segment.isEdited,
      sortOrder: segment.sortOrder,
      startSeconds: Math.round(segment.startSeconds * 1000) / 1000,
      text: cleanText,
      updatedAt: segment.updatedAt.toISOString(),
    });
  }

  return snapshot;
}

async function createPendingCaptionRenderJobOnce({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}) {
  const ownedClip = await prisma.clip.findFirst({
    where: {
      id: clipId,
      userId,
    },
    select: {
      id: true,
      outputKey: true,
      status: true,
    },
  });

  if (!ownedClip) {
    throw new CaptionRenderJobValidationError("clip_not_found");
  }

  if (ownedClip.status !== ClipStatus.COMPLETED || !ownedClip.outputKey) {
    throw new CaptionRenderJobValidationError("clip_not_ready");
  }

  const completedOutput = await resolveCompletedClipOutputForUser({
    clipId,
    userId,
  });

  if (!completedOutput) {
    throw new CaptionRenderJobValidationError("clip_output_unavailable");
  }

  return prisma.$transaction(
    async (tx) => {
      const clip = await tx.clip.findFirst({
        where: {
          id: clipId,
          status: ClipStatus.COMPLETED,
          userId,
        },
        select: {
          id: true,
          outputKey: true,
          subtitleTrack: {
            select: {
              id: true,
              presetKey: true,
              segments: {
                orderBy: [
                  {
                    sortOrder: "asc",
                  },
                  {
                    startSeconds: "asc",
                  },
                ],
                select: {
                  endSeconds: true,
                  id: true,
                  isEdited: true,
                  sortOrder: true,
                  startSeconds: true,
                  text: true,
                  updatedAt: true,
                },
              },
              status: true,
              userId: true,
            },
          },
          userId: true,
          videoId: true,
        },
      });

      if (!clip || !clip.outputKey) {
        throw new CaptionRenderJobValidationError("clip_not_ready");
      }

      if (!clip.subtitleTrack || clip.subtitleTrack.status !== SubtitleTrackStatus.READY) {
        throw new CaptionRenderJobValidationError("subtitles_not_ready");
      }

      if (clip.subtitleTrack.userId !== userId) {
        throw new CaptionRenderJobValidationError("subtitles_not_ready");
      }

      const activeJob = await tx.processingJob.findFirst({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          captionRender: {
            select: {
              id: true,
              status: true,
            },
          },
          id: true,
          progress: true,
          status: true,
          type: true,
        },
        where: {
          captionRender: {
            status: {
              in: [CaptionRenderStatus.PENDING, CaptionRenderStatus.PROCESSING],
            },
          },
          clipId: clip.id,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING],
          },
          type: JobType.BURN_CAPTIONS,
          userId,
        },
      });

      if (activeJob?.captionRender) {
        return {
          job: serializeJob(activeJob),
          render: serializeRender(activeJob.captionRender),
          reusedJob: true,
        };
      }

      const segmentsSnapshot = buildSegmentsSnapshot(clip.subtitleTrack.segments);

      if (segmentsSnapshot.length === 0) {
        throw new CaptionRenderJobValidationError("no_subtitle_segments");
      }

      const presetKey = normalizeCaptionPresetKey(clip.subtitleTrack.presetKey);
      const presetStyle = getCaptionPresetStyleSnapshot(presetKey);
      const render = await tx.captionRender.create({
        data: {
          clipId: clip.id,
          presetKey,
          presetStyle,
          segmentsSnapshot: segmentsSnapshot as Prisma.InputJsonValue,
          status: CaptionRenderStatus.PENDING,
          subtitleTrackId: clip.subtitleTrack.id,
          userId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      const job = await tx.processingJob.create({
        data: {
          captionRenderId: render.id,
          clipId: clip.id,
          status: JobStatus.PENDING,
          type: JobType.BURN_CAPTIONS,
          userId,
          videoId: clip.videoId,
        },
        select: {
          id: true,
          progress: true,
          status: true,
          type: true,
        },
      });

      return {
        job: serializeJob(job),
        render: serializeRender(render),
        reusedJob: false,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createPendingCaptionRenderJob({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}) {
  try {
    return await createPendingCaptionRenderJobOnce({ clipId, userId });
  } catch (error) {
    if (isRetryableCaptionRenderJobWriteError(error)) {
      return createPendingCaptionRenderJobOnce({ clipId, userId });
    }

    throw error;
  }
}
