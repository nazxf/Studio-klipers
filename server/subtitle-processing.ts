import { spawn } from "node:child_process";
import path from "node:path";

import {
  ClipStatus,
  JobStatus,
  JobType,
  SubtitleTrackStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { resolveCompletedClipOutputForUser } from "./clip-files";
import {
  getPythonCommand,
  readTranscriptionConfig,
  type TranscriptionConfig,
} from "./transcription-config";

const MAX_CAPTURED_TRANSCRIPTION_OUTPUT = 20_000;
const TRANSCRIPTION_TIMEOUT_MS = 30 * 60 * 1000;

type ClaimedSubtitleJob = {
  clipId: string | null;
  id: string;
};

type SubtitleWorkerResult =
  | {
      status: "idle";
    }
  | {
      jobId: string;
      segmentCount: number;
      status: "processed";
      trackId: string;
    }
  | {
      errorMessage: string;
      jobId: string;
      status: "failed";
      trackId: string | null;
    };

type RawTranscriptionSegment = {
  confidence?: unknown;
  endSeconds?: unknown;
  startSeconds?: unknown;
  text?: unknown;
  words?: unknown;
};

type NormalizedTranscriptionSegment = {
  confidence: number | null;
  endSeconds: number;
  startSeconds: number;
  text: string;
  words?: Prisma.InputJsonValue;
};

type NormalizedTranscriptionResult = {
  engine: string;
  languageCode: string | null;
  languageProbability: number | null;
  model: string;
  segments: NormalizedTranscriptionSegment[];
};

function appendCapturedOutput(currentOutput: string, nextChunk: Buffer) {
  const combinedOutput = currentOutput + nextChunk.toString("utf8");

  if (combinedOutput.length <= MAX_CAPTURED_TRANSCRIPTION_OUTPUT) {
    return combinedOutput;
  }

  return combinedOutput.slice(-MAX_CAPTURED_TRANSCRIPTION_OUTPUT);
}

function readLastLine(output: string) {
  return (
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? null
  );
}

function getRawSubtitleErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.replace(/\s+/g, " ").trim();
}

function getSafeSubtitleErrorMessage(error: unknown) {
  const message = getRawSubtitleErrorMessage(error).toLowerCase();

  if (
    message.includes("faster_whisper") ||
    message.includes("faster-whisper") ||
    message.includes("modulenotfounderror") ||
    message.includes("no module named")
  ) {
    return "Local transcription dependencies are missing. Run npm run check:transcription.";
  }

  if (
    message.includes("completed clip output") ||
    message.includes("clip output") ||
    message.includes("missing") ||
    message.includes("enoent") ||
    message.includes("no such file")
  ) {
    return "The completed clip file is missing.";
  }

  if (
    message.includes("invalid transcription json") ||
    message.includes("invalid transcription output") ||
    message.includes("invalid segment")
  ) {
    return "The transcription worker returned invalid output.";
  }

  if (message.includes("timed out")) {
    return "Subtitle generation timed out. Try a smaller model or retry later.";
  }

  return "Subtitle generation failed. Please try again.";
}

async function claimNextPendingSubtitleJob(): Promise<ClaimedSubtitleJob | null> {
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
        status: JobStatus.PENDING,
        type: JobType.GENERATE_SUBTITLES,
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
        id: pendingJob.id,
        status: JobStatus.PENDING,
      },
    });

    if (claimedJob.count !== 1) {
      return null;
    }

    if (pendingJob.clipId) {
      await tx.subtitleTrack.updateMany({
        data: {
          errorMessage: null,
          status: SubtitleTrackStatus.PROCESSING,
        },
        where: {
          clipId: pendingJob.clipId,
          status: {
            not: SubtitleTrackStatus.READY,
          },
        },
      });
    }

    return pendingJob;
  });
}

async function loadSubtitleJob(jobId: string) {
  return prisma.processingJob.findUnique({
    select: {
      clip: {
        select: {
          id: true,
          outputKey: true,
          status: true,
          subtitleTrack: {
            select: {
              clipId: true,
              id: true,
              status: true,
              userId: true,
            },
          },
          userId: true,
          videoId: true,
        },
      },
      clipId: true,
      id: true,
      type: true,
      userId: true,
      videoId: true,
    },
    where: {
      id: jobId,
    },
  });
}

function getSidecarPath() {
  return path.resolve(process.cwd(), "workers", "transcribe-faster-whisper.py");
}

function runTranscriptionSidecar({
  config,
  mediaPath,
}: {
  config: TranscriptionConfig;
  mediaPath: string;
}) {
  const input = JSON.stringify({
    computeType: config.computeType,
    device: config.device,
    language: config.language,
    mediaPath,
    model: config.model,
    wordTimestamps: true,
  });

  return new Promise<unknown>((resolve, reject) => {
    const child = spawn(getPythonCommand(), [getSidecarPath()], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      child.kill();
      reject(new Error("Transcription sidecar timed out."));
    }, TRANSCRIPTION_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendCapturedOutput(stdout, chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendCapturedOutput(stderr, chunk);
    });

    child.on("error", (error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(
          new Error(
            `Transcription sidecar failed with exit code ${exitCode ?? "unknown"}: ${
              readLastLine(stderr) ?? "no stderr output"
            }`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Invalid transcription JSON output."));
      }
    });

    child.stdin.end(input);
  });
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeJsonValue(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeTranscriptionResult(rawResult: unknown): NormalizedTranscriptionResult {
  if (!rawResult || typeof rawResult !== "object") {
    throw new Error("Invalid transcription output.");
  }

  const result = rawResult as {
    engine?: unknown;
    languageCode?: unknown;
    languageProbability?: unknown;
    model?: unknown;
    segments?: unknown;
  };

  if (!Array.isArray(result.segments)) {
    throw new Error("Invalid transcription output: segments must be an array.");
  }

  const segments: NormalizedTranscriptionSegment[] = [];

  for (const rawSegment of result.segments as RawTranscriptionSegment[]) {
    if (!rawSegment || typeof rawSegment !== "object") {
      throw new Error("Invalid segment in transcription output.");
    }

    const startSeconds = rawSegment.startSeconds;
    const endSeconds = rawSegment.endSeconds;
    const text = typeof rawSegment.text === "string" ? rawSegment.text.replace(/\s+/g, " ").trim() : "";

    if (!text) {
      continue;
    }

    if (
      typeof startSeconds !== "number" ||
      typeof endSeconds !== "number" ||
      !Number.isFinite(startSeconds) ||
      !Number.isFinite(endSeconds) ||
      startSeconds < 0 ||
      endSeconds < startSeconds
    ) {
      throw new Error("Invalid segment timing in transcription output.");
    }

    segments.push({
      confidence: readNullableNumber(rawSegment.confidence),
      endSeconds: Math.round(endSeconds * 1000) / 1000,
      startSeconds: Math.round(startSeconds * 1000) / 1000,
      text,
      words: normalizeJsonValue(rawSegment.words),
    });
  }

  return {
    engine: readNullableString(result.engine) ?? "faster-whisper",
    languageCode: readNullableString(result.languageCode),
    languageProbability: readNullableNumber(result.languageProbability),
    model: readNullableString(result.model) ?? readTranscriptionConfig().model,
    segments,
  };
}

async function saveSubtitleResult({
  jobId,
  result,
  trackId,
  userId,
}: {
  jobId: string;
  result: NormalizedTranscriptionResult;
  trackId: string;
  userId: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.subtitleSegment.deleteMany({
      where: {
        trackId,
      },
    });

    if (result.segments.length > 0) {
      const segmentData: Prisma.SubtitleSegmentCreateManyInput[] = result.segments.map(
        (segment, index) => ({
          confidence: segment.confidence,
          endSeconds: segment.endSeconds,
          generatedText: segment.text,
          isEdited: false,
          sortOrder: index,
          startSeconds: segment.startSeconds,
          text: segment.text,
          trackId,
          userId,
          words: segment.words,
        }),
      );

      await tx.subtitleSegment.createMany({
        data: segmentData,
      });
    }

    const updatedTrack = await tx.subtitleTrack.updateMany({
      data: {
        engine: result.engine,
        errorMessage: null,
        generatedAt: new Date(),
        languageCode: result.languageCode,
        languageProbability: result.languageProbability,
        modelName: result.model,
        status: SubtitleTrackStatus.READY,
      },
      where: {
        id: trackId,
        status: {
          not: SubtitleTrackStatus.READY,
        },
      },
    });

    if (updatedTrack.count !== 1) {
      throw new Error("Subtitle track is already ready.");
    }

    await tx.processingJob.update({
      data: {
        completedAt: new Date(),
        errorMessage: null,
        progress: 100,
        status: JobStatus.COMPLETED,
      },
      where: {
        id: jobId,
      },
    });
  });
}

async function markSubtitleJobFailed({
  errorMessage,
  jobId,
  trackId,
}: {
  errorMessage: string;
  jobId: string;
  trackId: string | null;
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

  if (trackId) {
    updates.push(
      prisma.subtitleTrack.updateMany({
        data: {
          errorMessage,
          status: SubtitleTrackStatus.FAILED,
        },
        where: {
          id: trackId,
          status: {
            not: SubtitleTrackStatus.READY,
          },
        },
      }),
    );
  }

  await prisma.$transaction(updates);
}

export async function processNextSubtitleJob(): Promise<SubtitleWorkerResult> {
  const claimedJob = await claimNextPendingSubtitleJob();

  if (!claimedJob) {
    return { status: "idle" };
  }

  let trackId: string | null = null;

  try {
    const job = await loadSubtitleJob(claimedJob.id);

    if (!job) {
      throw new Error("Claimed subtitle job could not be loaded.");
    }

    if (job.type !== JobType.GENERATE_SUBTITLES) {
      throw new Error("Processing job type is not a subtitle generation job.");
    }

    if (!job.clipId || !job.clip) {
      throw new Error("Subtitle job has no related clip.");
    }

    if (!job.clip.outputKey || job.clip.status !== ClipStatus.COMPLETED) {
      throw new Error("Subtitle job clip is not completed.");
    }

    if (!job.clip.subtitleTrack) {
      throw new Error("Subtitle job has no subtitle track.");
    }

    trackId = job.clip.subtitleTrack.id;

    if (
      job.clip.userId !== job.userId ||
      job.clip.videoId !== job.videoId ||
      job.clip.subtitleTrack.userId !== job.userId ||
      job.clip.subtitleTrack.clipId !== job.clip.id
    ) {
      throw new Error("Subtitle job ownership data is inconsistent.");
    }

    if (job.clip.subtitleTrack.status === SubtitleTrackStatus.READY) {
      throw new Error("Subtitle track is already ready.");
    }

    const clipOutput = await resolveCompletedClipOutputForUser({
      clipId: job.clip.id,
      userId: job.userId,
    });

    if (!clipOutput) {
      throw new Error("Completed clip output file is missing.");
    }

    const rawResult = await runTranscriptionSidecar({
      config: readTranscriptionConfig(),
      mediaPath: clipOutput.filePath,
    });
    const result = normalizeTranscriptionResult(rawResult);

    await saveSubtitleResult({
      jobId: job.id,
      result,
      trackId,
      userId: job.userId,
    });

    return {
      jobId: job.id,
      segmentCount: result.segments.length,
      status: "processed",
      trackId,
    };
  } catch (error) {
    const errorMessage = getSafeSubtitleErrorMessage(error);

    console.error(`Subtitle job ${claimedJob.id} failed: ${errorMessage}`);

    await markSubtitleJobFailed({
      errorMessage,
      jobId: claimedJob.id,
      trackId,
    });

    return {
      errorMessage,
      jobId: claimedJob.id,
      status: "failed",
      trackId,
    };
  }
}
