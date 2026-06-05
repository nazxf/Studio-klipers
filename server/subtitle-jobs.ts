import {
  ClipStatus,
  JobStatus,
  JobType,
  SubtitleSource,
  SubtitleTrackStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveCompletedClipOutputForUser } from "@/server/clip-files";

const VALID_SUBTITLE_JOB_ERROR_CODES = new Set([
  "clip_not_found",
  "clip_not_ready",
  "clip_output_unavailable",
  "subtitles_already_ready",
]);

export class SubtitleJobValidationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function getSubtitleJobValidationMessage(errorCode?: string) {
  if (!errorCode || !VALID_SUBTITLE_JOB_ERROR_CODES.has(errorCode)) {
    return null;
  }

  const messages: Record<string, string> = {
    clip_not_found: "The clip was not found for this workspace.",
    clip_not_ready: "Only completed clips can generate subtitles.",
    clip_output_unavailable: "The completed clip output is not available.",
    subtitles_already_ready: "This clip already has generated subtitles.",
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

function serializeTrack(track: {
  id: string;
  clipId: string;
  status: SubtitleTrackStatus;
}) {
  return {
    clipId: track.clipId,
    id: track.id,
    status: track.status,
  };
}

function isRetryableSubtitleJobWriteError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

async function createPendingSubtitleGenerationJobOnce({
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
    throw new SubtitleJobValidationError("clip_not_found");
  }

  if (ownedClip.status !== ClipStatus.COMPLETED || !ownedClip.outputKey) {
    throw new SubtitleJobValidationError("clip_not_ready");
  }

  const completedOutput = await resolveCompletedClipOutputForUser({
    clipId,
    userId,
  });

  if (!completedOutput) {
    throw new SubtitleJobValidationError("clip_output_unavailable");
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
          status: true,
          subtitleTrack: {
            select: {
              clipId: true,
              id: true,
              status: true,
            },
          },
          userId: true,
          videoId: true,
        },
      });

      if (!clip || !clip.outputKey) {
        throw new SubtitleJobValidationError("clip_not_ready");
      }

      if (clip.subtitleTrack?.status === SubtitleTrackStatus.READY) {
        throw new SubtitleJobValidationError("subtitles_already_ready");
      }

      const activeJob = await tx.processingJob.findFirst({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          progress: true,
          status: true,
          type: true,
        },
        where: {
          clipId: clip.id,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING],
          },
          type: JobType.GENERATE_SUBTITLES,
          userId,
        },
      });

      let track = clip.subtitleTrack;

      if (!track) {
        track = await tx.subtitleTrack.create({
          data: {
            clipId: clip.id,
            source: SubtitleSource.AUTO,
            status: SubtitleTrackStatus.PENDING,
            userId,
          },
          select: {
            clipId: true,
            id: true,
            status: true,
          },
        });
      }

      if (activeJob) {
        return {
          job: serializeJob(activeJob),
          reusedJob: true,
          track: serializeTrack(track),
        };
      }

      if (track.status !== SubtitleTrackStatus.PENDING) {
        track = await tx.subtitleTrack.update({
          data: {
            errorMessage: null,
            generatedAt: null,
            status: SubtitleTrackStatus.PENDING,
          },
          select: {
            clipId: true,
            id: true,
            status: true,
          },
          where: {
            id: track.id,
          },
        });
      } else {
        await tx.subtitleTrack.update({
          data: {
            errorMessage: null,
          },
          where: {
            id: track.id,
          },
        });
      }

      const job = await tx.processingJob.create({
        data: {
          clipId: clip.id,
          status: JobStatus.PENDING,
          type: JobType.GENERATE_SUBTITLES,
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
        reusedJob: false,
        track: serializeTrack(track),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createPendingSubtitleGenerationJob({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}) {
  try {
    return await createPendingSubtitleGenerationJobOnce({ clipId, userId });
  } catch (error) {
    if (isRetryableSubtitleJobWriteError(error)) {
      return createPendingSubtitleGenerationJobOnce({ clipId, userId });
    }

    throw error;
  }
}
