import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { ClipStatus, JobStatus, JobType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import {
  getRawClipProcessingErrorMessage,
  getSafeClipProcessingErrorMessage,
} from "./clip-errors";
import { runFfmpegProcess } from "./ffmpeg-runner";
import { getLocalClipOutputKey, resolveLocalUploadKey } from "./storage";

const CLIP_FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_CAPTURED_FFMPEG_OUTPUT = 5_000;
const MAX_CLIP_JOB_ATTEMPTS = 3;

type ClaimedJob = {
  clipId: string | null;
  id: string;
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
  return prisma.$transaction(async (tx) => {
    const pendingJob = await tx.processingJob.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        clipId: true,
        id: true,
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
        },
      });
    }

    return pendingJob;
  });
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
  const args = [
    "-y",
    "-ss",
    String(startSeconds),
    "-i",
    sourcePath,
    "-t",
    String(durationSeconds),
    "-c",
    "copy",
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
}: {
  clipId: string;
  jobId: string;
  outputKey: string;
  outputSizeBytes: number;
}) {
  await prisma.$transaction([
    prisma.clip.update({
      data: {
        errorMessage: null,
        outputKey,
        sizeBytes: BigInt(outputSizeBytes),
        status: ClipStatus.COMPLETED,
      },
      where: {
        id: clipId,
      },
    }),
    prisma.processingJob.update({
      data: {
        completedAt: new Date(),
        errorMessage: null,
        progress: 100,
        status: JobStatus.COMPLETED,
      },
      where: {
        id: jobId,
      },
    }),
  ]);
}

async function markClipJobFailed({
  clipId,
  errorMessage,
  jobId,
}: {
  clipId: string | null;
  errorMessage: string;
  jobId: string;
}) {
  const updates: Prisma.PrismaPromise<unknown>[] = [
    prisma.processingJob.update({
      data: {
        completedAt: new Date(),
        errorMessage,
        status: JobStatus.FAILED,
      },
      where: {
        id: jobId,
      },
    }),
  ];

  if (clipId) {
    updates.push(
      prisma.clip.update({
        data: {
          errorMessage,
          status: ClipStatus.FAILED,
        },
        where: {
          id: clipId,
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
    });

    return {
      clipId,
      errorMessage,
      jobId: claimedJob.id,
      status: "failed",
    };
  }
}
