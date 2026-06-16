import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { ClipStatus, JobStatus, JobType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getRawClipProcessingErrorMessage,
  getSafeClipProcessingErrorMessage,
} from "@/server/clip-errors";
import { runFfmpegProcess } from "@/server/ffmpeg-runner";
import { getLocalClipOutputKey, resolveLocalUploadKey } from "@/server/storage";

const CLIP_FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_CLIP_JOB_MS = CLIP_FFMPEG_TIMEOUT_MS + 60_000;
const MAX_CAPTURED_FFMPEG_OUTPUT = 5_000;
const MAX_CLIP_JOB_ATTEMPTS = 3;
const STALE_CLIP_JOB_RETRY_MESSAGE = "Clip processing stopped before finishing. Retrying.";
const STALE_CLIP_JOB_FAILED_MESSAGE =
  "Clip processing stopped before finishing. Create the clip again.";

type ClaimedJob = {
  clipId: string | null;
  id: string;
  userId: string;
};

type WorkerResult =
  | {
      status: "idle";
    }
  | {
      clipId: string;
      jobId: string;
      outputKey: string;
      outputPath: string;
      status: "processed";
    }
  | {
      clipId: string | null;
      errorMessage: string;
      jobId: string;
      status: "failed";
    };

async function assertFileExists(filePath: string, label: string) {
  const fileStat = await stat(filePath);

  if (!fileStat.isFile()) {
    throw new Error(`${label} is not a file.`);
  }

  return fileStat;
}

async function claimNextPendingClipJob(): Promise<ClaimedJob | null> {
  // Serializable isolation prevents two concurrent workers from both reading
  // the same PENDING job before either commits the PROCESSING flip. The
  // updateMany count check is still kept as a belt-and-braces guard.
  return prisma.$transaction(
    async (tx) => {
    const staleStartedBefore = new Date(Date.now() - STALE_CLIP_JOB_MS);
    const staleJobs = await tx.processingJob.findMany({
      select: {
        attempts: true,
        clipId: true,
        id: true,
        userId: true,
      },
      take: 20,
      where: {
        startedAt: {
          lt: staleStartedBefore,
        },
        status: JobStatus.PROCESSING,
        type: JobType.CREATE_CLIP,
      },
    });

    for (const staleJob of staleJobs) {
      if (staleJob.attempts >= MAX_CLIP_JOB_ATTEMPTS) {
        await tx.processingJob.updateMany({
          data: {
            completedAt: new Date(),
            errorMessage: STALE_CLIP_JOB_FAILED_MESSAGE,
            status: JobStatus.FAILED,
          },
          where: {
            id: staleJob.id,
            status: JobStatus.PROCESSING,
            type: JobType.CREATE_CLIP,
            userId: staleJob.userId,
          },
        });

        if (staleJob.clipId) {
          await tx.clip.updateMany({
            data: {
              errorMessage: STALE_CLIP_JOB_FAILED_MESSAGE,
              status: ClipStatus.FAILED,
            },
            where: {
              id: staleJob.clipId,
              status: ClipStatus.PROCESSING,
              userId: staleJob.userId,
            },
          });
        }

        continue;
      }

      await tx.processingJob.updateMany({
        data: {
          completedAt: null,
          errorMessage: STALE_CLIP_JOB_RETRY_MESSAGE,
          progress: 0,
          startedAt: null,
          status: JobStatus.PENDING,
        },
        where: {
          id: staleJob.id,
          status: JobStatus.PROCESSING,
          type: JobType.CREATE_CLIP,
          userId: staleJob.userId,
        },
      });

      if (staleJob.clipId) {
        await tx.clip.updateMany({
          data: {
            errorMessage: null,
            status: ClipStatus.PENDING,
          },
          where: {
            id: staleJob.clipId,
            status: ClipStatus.PROCESSING,
            userId: staleJob.userId,
          },
        });
      }
    }

    const pendingJob = await tx.processingJob.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        clipId: true,
        id: true,
        userId: true,
      },
      where: {
        attempts: {
          lt: MAX_CLIP_JOB_ATTEMPTS,
        },
        status: JobStatus.PENDING,
        type: JobType.CREATE_CLIP,
      },
    });

    if (!pendingJob) {
      return null;
    }

    const claimedJob = await tx.processingJob.updateMany({
      data: {
        attempts: {
          increment: 1,
        },
        completedAt: null,
        errorMessage: null,
        progress: 10,
        startedAt: new Date(),
        status: JobStatus.PROCESSING,
      },
      where: {
        attempts: {
          lt: MAX_CLIP_JOB_ATTEMPTS,
        },
        id: pendingJob.id,
        status: JobStatus.PENDING,
        type: JobType.CREATE_CLIP,
      },
    });

    if (claimedJob.count !== 1) {
      return null;
    }

    if (pendingJob.clipId) {
      await tx.clip.updateMany({
        data: {
          errorMessage: null,
          status: ClipStatus.PROCESSING,
        },
        where: {
          id: pendingJob.clipId,
          userId: pendingJob.userId,
        },
      });
    }

    return pendingJob;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

async function loadProcessingJob(jobId: string) {
  return prisma.processingJob.findUnique({
    select: {
      clip: {
        select: {
          durationSeconds: true,
          endSeconds: true,
          id: true,
          startSeconds: true,
          userId: true,
          videoId: true,
        },
      },
      clipId: true,
      id: true,
      userId: true,
      video: {
        select: {
          id: true,
          sourceKey: true,
          userId: true,
        },
      },
      videoId: true,
    },
    where: {
      id: jobId,
    },
  });
}

function runFfmpeg({
  durationSeconds,
  outputPath,
  sourcePath,
  startSeconds,
}: {
  durationSeconds: number;
  outputPath: string;
  sourcePath: string;
  startSeconds: number;
}) {
  // Accurate seek: -ss AFTER -i forces decode-up-to-start so the clip begins
  // exactly at the user-selected timestamp instead of snapping to the nearest
  // keyframe. Re-encode video with libx264 (veryfast/CRF 20) and audio with AAC
  // so the resulting MP4 is web-friendly and faststart-streamable.
  const args = [
    "-y",
    "-i",
    sourcePath,
    "-ss",
    String(startSeconds),
    "-t",
    String(durationSeconds),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-avoid_negative_ts",
    "make_zero",
    outputPath,
  ];

  return runFfmpegProcess({
    args,
    failureMessage: "FFmpeg failed",
    maxCapturedStderr: MAX_CAPTURED_FFMPEG_OUTPUT,
    timeoutMessage: "FFmpeg clip processing timed out",
    timeoutMs: CLIP_FFMPEG_TIMEOUT_MS,
  });
}

async function markClipJobCompleted({
  clipId,
  jobId,
  outputKey,
  outputSizeBytes,
  userId,
}: {
  clipId: string;
  jobId: string;
  outputKey: string;
  outputSizeBytes: number;
  userId: string;
}) {
  await prisma.$transaction([
    prisma.clip.updateMany({
      data: {
        errorMessage: null,
        outputKey,
        sizeBytes: BigInt(outputSizeBytes),
        status: ClipStatus.COMPLETED,
      },
      where: {
        id: clipId,
        userId,
      },
    }),
    prisma.processingJob.updateMany({
      data: {
        completedAt: new Date(),
        errorMessage: null,
        progress: 100,
        status: JobStatus.COMPLETED,
      },
      where: {
        id: jobId,
        userId,
      },
    }),
  ]);
}

async function markClipJobFailed({
  clipId,
  errorMessage,
  jobId,
  userId,
}: {
  clipId: string | null;
  errorMessage: string;
  jobId: string;
  userId: string;
}) {
  const updates: Prisma.PrismaPromise<unknown>[] = [
    prisma.processingJob.updateMany({
      data: {
        completedAt: new Date(),
        errorMessage,
        status: JobStatus.FAILED,
      },
      where: {
        id: jobId,
        userId,
      },
    }),
  ];

  if (clipId) {
    updates.push(
      prisma.clip.updateMany({
        data: {
          errorMessage,
          status: ClipStatus.FAILED,
        },
        where: {
          id: clipId,
          userId,
        },
      }),
    );
  }

  await prisma.$transaction(updates);
}

export async function processNextClipJob(): Promise<WorkerResult> {
  const claimedJob = await claimNextPendingClipJob();

  if (!claimedJob) {
    return { status: "idle" };
  }

  let clipId = claimedJob.clipId;
  let outputPath: string | null = null;

  try {
    const job = await loadProcessingJob(claimedJob.id);

    if (!job) {
      throw new Error("Claimed processing job could not be loaded.");
    }

    if (!job.clip) {
      throw new Error("Processing job has no related clip.");
    }

    if (!job.video?.sourceKey) {
      throw new Error("Processing job source video is missing a local source key.");
    }

    if (
      job.clip.userId !== job.userId ||
      job.video.userId !== job.userId ||
      job.clip.videoId !== job.videoId
    ) {
      throw new Error("Processing job ownership data is inconsistent.");
    }

    clipId = job.clip.id;

    const sourcePath = resolveLocalUploadKey(job.video.sourceKey);
    await assertFileExists(sourcePath, "Source video");

    const outputKey = getLocalClipOutputKey(job.userId, job.clip.id);
    outputPath = resolveLocalUploadKey(outputKey);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await unlink(outputPath).catch(() => undefined);

    await runFfmpeg({
      durationSeconds: job.clip.durationSeconds,
      outputPath,
      sourcePath,
      startSeconds: job.clip.startSeconds,
    });

    const outputStat = await assertFileExists(outputPath, "Output clip");

    if (outputStat.size <= 0) {
      throw new Error("Output clip is empty.");
    }

    await markClipJobCompleted({
      clipId: job.clip.id,
      jobId: job.id,
      outputKey,
      outputSizeBytes: outputStat.size,
      userId: job.userId,
    });

    return {
      clipId: job.clip.id,
      jobId: job.id,
      outputKey,
      outputPath,
      status: "processed",
    };
  } catch (error) {
    const rawErrorMessage = getRawClipProcessingErrorMessage(error);
    const errorMessage = getSafeClipProcessingErrorMessage(error);

    console.error(`Clip job ${claimedJob.id} failed: ${rawErrorMessage || errorMessage}`);

    if (outputPath) {
      await unlink(outputPath).catch(() => undefined);
    }

    await markClipJobFailed({
      clipId,
      errorMessage,
      jobId: claimedJob.id,
      userId: claimedJob.userId,
    });

    return {
      clipId,
      errorMessage,
      jobId: claimedJob.id,
      status: "failed",
    };
  }
}
