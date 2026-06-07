import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CaptionRenderStatus,
  JobStatus,
  JobType,
  SubtitleTrackStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

import {
  type CaptionPresetStyleSnapshot,
  getCaptionPresetStyleSnapshot,
  normalizeCaptionPresetKey,
} from "@/lib/caption-presets";
import { prisma } from "@/lib/prisma";
import { getRawClipProcessingErrorMessage } from "@/server/clip-errors";
import { resolveCompletedClipOutputForUser } from "@/server/clip-files";
import { runFfmpegProcess } from "@/server/ffmpeg-runner";
import { probeVideoDimensions } from "@/server/media-toolchain";
import {
  getLocalCaptionRenderOutputKey,
  resolveLocalUploadKey,
} from "@/server/storage";

const CAPTION_RENDER_FFMPEG_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_CAPTURED_FFMPEG_OUTPUT = 8_000;
const MAX_CAPTION_RENDER_JOB_ATTEMPTS = 3;

type ClaimedCaptionRenderJob = {
  captionRenderId: string | null;
  clipId: string | null;
  id: string;
};

type CaptionRenderWorkerResult =
  | {
      status: "idle";
    }
  | {
      jobId: string;
      outputKey: string;
      renderId: string;
      status: "processed";
    }
  | {
      errorMessage: string;
      jobId: string;
      renderId: string | null;
      status: "failed";
    };

type CaptionRenderSegmentSnapshot = {
  endSeconds: number;
  id: string;
  isEdited: boolean;
  sortOrder: number;
  startSeconds: number;
  text: string;
  updatedAt: string;
};

type AssStyle = {
  alignment: number;
  backColor: string;
  bold: -1 | 0;
  borderStyle: 1 | 3;
  fontSize: number;
  marginV: number;
  outline: number;
  outlineColor: string;
  primaryColor: string;
  shadow: number;
};

async function assertFileExists(filePath: string, label: string) {
  const fileStat = await stat(filePath);

  if (!fileStat.isFile()) {
    throw new Error(`${label} is not a file.`);
  }

  return fileStat;
}

function getSafeCaptionRenderErrorMessage(error: unknown) {
  const rawMessage = getRawClipProcessingErrorMessage(error);
  const message = rawMessage.toLowerCase();

  if (
    message.includes("completed clip output") ||
    message.includes("clip output") ||
    message.includes("missing") ||
    message.includes("enoent") ||
    message.includes("no such file")
  ) {
    return "The completed clip file is missing.";
  }

  if (message.includes("libass") || message.includes("no such filter") || message.includes("ass=")) {
    return "Caption burn-in failed. Confirm this FFmpeg build includes libass subtitle support.";
  }

  if (
    message.includes("output caption render") ||
    message.includes("output file") ||
    message.includes("could not be created") ||
    message.includes("empty")
  ) {
    return "The captioned MP4 could not be created.";
  }

  if (message.includes("invalid render snapshot") || message.includes("subtitle segment")) {
    return "Caption render data is invalid. Regenerate subtitles and try again.";
  }

  if (message.includes("ffmpeg") || message.includes("exit code") || message.includes("invalid data")) {
    return "Caption render failed. Please try again.";
  }

  return "Caption render failed. Please try again.";
}

async function claimNextPendingCaptionRenderJob(): Promise<ClaimedCaptionRenderJob | null> {
  return prisma.$transaction(async (tx) => {
    const pendingJob = await tx.processingJob.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        captionRenderId: true,
        clipId: true,
        id: true,
      },
      where: {
        attempts: {
          lt: MAX_CAPTION_RENDER_JOB_ATTEMPTS,
        },
        status: JobStatus.PENDING,
        type: JobType.BURN_CAPTIONS,
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
          lt: MAX_CAPTION_RENDER_JOB_ATTEMPTS,
        },
        id: pendingJob.id,
        status: JobStatus.PENDING,
        type: JobType.BURN_CAPTIONS,
      },
    });

    if (claimedJob.count !== 1) {
      return null;
    }

    if (pendingJob.captionRenderId) {
      await tx.captionRender.updateMany({
        data: {
          completedAt: null,
          errorMessage: null,
          startedAt: new Date(),
          status: CaptionRenderStatus.PROCESSING,
        },
        where: {
          id: pendingJob.captionRenderId,
          status: CaptionRenderStatus.PENDING,
        },
      });
    }

    return pendingJob;
  });
}

async function loadCaptionRenderJob(jobId: string) {
  return prisma.processingJob.findUnique({
    select: {
      captionRender: {
        select: {
          clipId: true,
          id: true,
          presetKey: true,
          segmentsSnapshot: true,
          status: true,
          subtitleTrack: {
            select: {
              clipId: true,
              id: true,
              status: true,
              userId: true,
            },
          },
          subtitleTrackId: true,
          userId: true,
        },
      },
      captionRenderId: true,
      clip: {
        select: {
          id: true,
          outputKey: true,
          status: true,
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

function normalizeSegmentsSnapshot(rawSnapshot: Prisma.JsonValue) {
  if (!Array.isArray(rawSnapshot)) {
    throw new Error("Invalid render snapshot.");
  }

  const segments: CaptionRenderSegmentSnapshot[] = [];

  for (const rawSegment of rawSnapshot) {
    if (!rawSegment || typeof rawSegment !== "object" || Array.isArray(rawSegment)) {
      throw new Error("Invalid subtitle segment in render snapshot.");
    }

    const segment = rawSegment as Record<string, unknown>;
    const text = typeof segment.text === "string" ? segment.text.replace(/\s+/g, " ").trim() : "";
    const startSeconds = segment.startSeconds;
    const endSeconds = segment.endSeconds;

    if (!text) {
      continue;
    }

    if (
      typeof startSeconds !== "number" ||
      typeof endSeconds !== "number" ||
      !Number.isFinite(startSeconds) ||
      !Number.isFinite(endSeconds) ||
      startSeconds < 0 ||
      endSeconds <= startSeconds
    ) {
      throw new Error("Invalid subtitle segment timing in render snapshot.");
    }

    segments.push({
      endSeconds: Math.round(endSeconds * 1000) / 1000,
      id: typeof segment.id === "string" ? segment.id : "",
      isEdited: Boolean(segment.isEdited),
      sortOrder: typeof segment.sortOrder === "number" ? segment.sortOrder : segments.length,
      startSeconds: Math.round(startSeconds * 1000) / 1000,
      text,
      updatedAt: typeof segment.updatedAt === "string" ? segment.updatedAt : "",
    });
  }

  if (segments.length === 0) {
    throw new Error("Invalid render snapshot: no subtitle segments.");
  }

  return segments.sort(
    (left, right) => left.sortOrder - right.sortOrder || left.startSeconds - right.startSeconds,
  );
}

function formatAssTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100);

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(
    2,
    "0",
  )}.${String(centiseconds).padStart(2, "0")}`;
}

function escapeAssText(text: string) {
  return text
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\\/g, "\\\\")
        .replace(/{/g, "\\{")
        .replace(/}/g, "\\}"),
    )
    .join("\\N");
}

function getAssStyle(style: CaptionPresetStyleSnapshot): AssStyle {
  if (style.key === "LIME_PUNCH") {
    return {
      alignment: 2,
      backColor: "&HCC000000",
      bold: -1,
      borderStyle: 1,
      fontSize: 72,
      marginV: 120,
      outline: 5,
      outlineColor: "&HAA000000",
      primaryColor: "&H0000FFD1",
      shadow: 2,
    };
  }

  if (style.key === "GAMING_BOLD") {
    return {
      alignment: 2,
      backColor: "&HCC000000",
      bold: -1,
      borderStyle: 1,
      fontSize: 74,
      marginV: 118,
      outline: 6,
      outlineColor: "&H0000B8FF",
      primaryColor: "&H00FFFFFF",
      shadow: 3,
    };
  }

  if (style.key === "CLEAN_LOWER") {
    return {
      alignment: 2,
      backColor: "&HAA000000",
      bold: -1,
      borderStyle: 1,
      fontSize: 48,
      marginV: 105,
      outline: 3,
      outlineColor: "&H99000000",
      primaryColor: "&H00FFFFFF",
      shadow: 1,
    };
  }

  if (style.key === "CINEMATIC_POP") {
    return {
      alignment: 2,
      backColor: "&HAE000000",
      bold: -1,
      borderStyle: 3,
      fontSize: 56,
      marginV: 145,
      outline: 4,
      outlineColor: "&HAA000000",
      primaryColor: "&H00FFFFFF",
      shadow: 0,
    };
  }

  return {
    alignment: 2,
    backColor: "&HCC000000",
    bold: -1,
    borderStyle: 1,
    fontSize: 58,
    marginV: 130,
    outline: 4,
    outlineColor: "&HAA000000",
    primaryColor: "&H00FFFFFF",
    shadow: 1,
  };
}

function generateAssFile({
  dimensions,
  presetStyle,
  segments,
}: {
  dimensions: {
    height: number;
    width: number;
  };
  presetStyle: CaptionPresetStyleSnapshot;
  segments: CaptionRenderSegmentSnapshot[];
}) {
  const style = getAssStyle(presetStyle);
  const events = segments
    .map((segment) => {
      const rawText =
        presetStyle.casing === "uppercase" ? segment.text.toUpperCase() : segment.text;
      const text = escapeAssText(rawText);

      return `Dialogue: 0,${formatAssTime(segment.startSeconds)},${formatAssTime(
        segment.endSeconds,
      )},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
ScaledBorderAndShadow: yes
WrapStyle: 2
PlayResX: ${dimensions.width}
PlayResY: ${dimensions.height}
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${style.fontSize},${style.primaryColor},&H000000FF,${style.outlineColor},${style.backColor},${style.bold},0,0,0,100,100,0,0,${style.borderStyle},${style.outline},${style.shadow},${style.alignment},80,80,${style.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;
}

function runFfmpegCaptionBurn({
  outputPath,
  renderDirectory,
  sourcePath,
  tempOutputPath,
}: {
  outputPath: string;
  renderDirectory: string;
  sourcePath: string;
  tempOutputPath: string;
}) {
  const args = [
    "-y",
    "-i",
    sourcePath,
    "-vf",
    "ass=captions.ass",
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    path.basename(tempOutputPath),
  ];

  if (outputPath === tempOutputPath) {
    throw new Error("Output caption render path is invalid.");
  }

  return runFfmpegProcess({
    args,
    cwd: renderDirectory,
    failureMessage: "FFmpeg caption render failed",
    maxCapturedStderr: MAX_CAPTURED_FFMPEG_OUTPUT,
    timeoutMessage: "FFmpeg caption render timed out",
    timeoutMs: CAPTION_RENDER_FFMPEG_TIMEOUT_MS,
  });
}

async function markCaptionRenderJobCompleted({
  jobId,
  outputKey,
  outputSizeBytes,
  renderId,
}: {
  jobId: string;
  outputKey: string;
  outputSizeBytes: number;
  renderId: string;
}) {
  await prisma.$transaction([
    prisma.captionRender.update({
      data: {
        completedAt: new Date(),
        errorMessage: null,
        outputKey,
        sizeBytes: BigInt(outputSizeBytes),
        status: CaptionRenderStatus.COMPLETED,
      },
      where: {
        id: renderId,
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

async function markCaptionRenderJobFailed({
  errorMessage,
  jobId,
  renderId,
}: {
  errorMessage: string;
  jobId: string;
  renderId: string | null;
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

  if (renderId) {
    updates.push(
      prisma.captionRender.update({
        data: {
          completedAt: new Date(),
          errorMessage,
          status: CaptionRenderStatus.FAILED,
        },
        where: {
          id: renderId,
        },
      }),
    );
  }

  await prisma.$transaction(updates);
}

export async function processNextCaptionRenderJob(): Promise<CaptionRenderWorkerResult> {
  const claimedJob = await claimNextPendingCaptionRenderJob();

  if (!claimedJob) {
    return { status: "idle" };
  }

  let renderId = claimedJob.captionRenderId;
  let outputPath: string | null = null;
  let tempOutputPath: string | null = null;
  let assPath: string | null = null;

  try {
    const job = await loadCaptionRenderJob(claimedJob.id);

    if (!job) {
      throw new Error("Claimed caption render job could not be loaded.");
    }

    if (job.type !== JobType.BURN_CAPTIONS) {
      throw new Error("Processing job type is not a caption render job.");
    }

    if (!job.clipId || !job.clip) {
      throw new Error("Caption render job has no related clip.");
    }

    if (!job.captionRenderId || !job.captionRender) {
      throw new Error("Caption render job has no related render.");
    }

    renderId = job.captionRender.id;

    if (!job.clip.outputKey || job.clip.status !== "COMPLETED") {
      throw new Error("Caption render job clip is not completed.");
    }

    if (job.captionRender.status !== CaptionRenderStatus.PROCESSING) {
      throw new Error("Caption render is not processing.");
    }

    if (job.captionRender.subtitleTrack.status !== SubtitleTrackStatus.READY) {
      throw new Error("Caption render subtitle track is not ready.");
    }

    if (
      job.clip.userId !== job.userId ||
      job.clip.videoId !== job.videoId ||
      job.captionRender.userId !== job.userId ||
      job.captionRender.clipId !== job.clip.id ||
      job.captionRender.subtitleTrack.userId !== job.userId ||
      job.captionRender.subtitleTrack.clipId !== job.clip.id ||
      job.captionRender.subtitleTrackId !== job.captionRender.subtitleTrack.id
    ) {
      throw new Error("Caption render job ownership data is inconsistent.");
    }

    const clipOutput = await resolveCompletedClipOutputForUser({
      clipId: job.clip.id,
      userId: job.userId,
    });

    if (!clipOutput) {
      throw new Error("Completed clip output file is missing.");
    }

    const segments = normalizeSegmentsSnapshot(job.captionRender.segmentsSnapshot);
    const presetKey = normalizeCaptionPresetKey(job.captionRender.presetKey);
    const presetStyle = getCaptionPresetStyleSnapshot(presetKey);
    const outputKey = getLocalCaptionRenderOutputKey({
      clipId: job.clip.id,
      renderId: job.captionRender.id,
      userId: job.userId,
    });

    outputPath = resolveLocalUploadKey(outputKey);
    const renderDirectory = path.dirname(outputPath);
    tempOutputPath = path.join(renderDirectory, "captioned.tmp.mp4");
    assPath = path.join(renderDirectory, "captions.ass");

    await mkdir(renderDirectory, { recursive: true });
    await Promise.all([
      unlink(outputPath).catch(() => undefined),
      unlink(tempOutputPath).catch(() => undefined),
      unlink(assPath).catch(() => undefined),
    ]);

    let dimensions = {
      height: 1920,
      width: 1080,
    };

    try {
      dimensions = await probeVideoDimensions(clipOutput.filePath);
    } catch {
      // The ASS renderer still works with a stable fallback play resolution.
    }

    await writeFile(
      assPath,
      generateAssFile({
        dimensions,
        presetStyle,
        segments,
      }),
      "utf8",
    );

    await runFfmpegCaptionBurn({
      outputPath,
      renderDirectory,
      sourcePath: clipOutput.filePath,
      tempOutputPath,
    });

    const tempOutputStat = await assertFileExists(tempOutputPath, "Output caption render");

    if (tempOutputStat.size <= 0) {
      throw new Error("Output caption render is empty.");
    }

    await unlink(outputPath).catch(() => undefined);
    await rename(tempOutputPath, outputPath);

    const outputStat = await assertFileExists(outputPath, "Output caption render");

    if (outputStat.size <= 0) {
      throw new Error("Output caption render is empty.");
    }

    await unlink(assPath).catch(() => undefined);

    await markCaptionRenderJobCompleted({
      jobId: job.id,
      outputKey,
      outputSizeBytes: outputStat.size,
      renderId: job.captionRender.id,
    });

    return {
      jobId: job.id,
      outputKey,
      renderId: job.captionRender.id,
      status: "processed",
    };
  } catch (error) {
    const rawErrorMessage = getRawClipProcessingErrorMessage(error);
    const errorMessage = getSafeCaptionRenderErrorMessage(error);

    console.error(`Caption render job ${claimedJob.id} failed: ${rawErrorMessage || errorMessage}`);

    await Promise.all([
      outputPath ? unlink(outputPath).catch(() => undefined) : undefined,
      tempOutputPath ? unlink(tempOutputPath).catch(() => undefined) : undefined,
      assPath ? unlink(assPath).catch(() => undefined) : undefined,
    ]);

    await markCaptionRenderJobFailed({
      errorMessage,
      jobId: claimedJob.id,
      renderId,
    });

    return {
      errorMessage,
      jobId: claimedJob.id,
      renderId,
      status: "failed",
    };
  }
}
