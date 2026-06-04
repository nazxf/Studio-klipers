import { ClipStatus, JobStatus, JobType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const MIN_CLIP_DURATION_SECONDS = 3;
export const MAX_CLIP_DURATION_SECONDS = 300;
const MAX_CLIP_TITLE_LENGTH = 120;

const VALID_CLIP_ERROR_CODES = new Set([
  "invalid_payload",
  "invalid_start",
  "invalid_end",
  "end_before_start",
  "too_short",
  "too_long",
  "duration_missing",
  "beyond_duration",
  "video_not_found",
  "source_missing",
]);

export class ClipValidationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function parseSeconds(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const seconds = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return Math.round(seconds * 1000) / 1000;
}

function getClipTitle(title: unknown, videoTitle: string) {
  const cleanTitle = typeof title === "string" ? title.replace(/\s+/g, " ").trim() : "";

  if (cleanTitle) {
    return cleanTitle.slice(0, MAX_CLIP_TITLE_LENGTH);
  }

  return `${videoTitle} clip`.slice(0, MAX_CLIP_TITLE_LENGTH);
}

export function getClipValidationMessage(errorCode?: string) {
  if (!errorCode || !VALID_CLIP_ERROR_CODES.has(errorCode)) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_payload: "Send a clip title, start time, and end time.",
    invalid_start: "Start time must be a finite number greater than or equal to 0.",
    invalid_end: "End time must be a finite number.",
    end_before_start: "End time must be greater than start time.",
    too_short: "Clip duration must be at least 3 seconds.",
    too_long: "Clip duration must be 5 minutes or shorter.",
    duration_missing: "This source video needs duration metadata before clips can be created.",
    beyond_duration: "End time cannot be greater than the source video duration.",
    video_not_found: "The source video was not found for this workspace.",
    source_missing: "This video does not have a local source file registered.",
  };

  return messages[errorCode];
}

export async function createPendingClipJob({
  endSeconds: rawEndSeconds,
  startSeconds: rawStartSeconds,
  title,
  userId,
  videoId,
}: {
  endSeconds: unknown;
  startSeconds: unknown;
  title: unknown;
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
      durationSeconds: true,
      sourceKey: true,
    },
  });

  if (!video) {
    throw new ClipValidationError("video_not_found");
  }

  if (!video.sourceKey) {
    throw new ClipValidationError("source_missing");
  }

  const startSeconds = parseSeconds(rawStartSeconds);
  const endSeconds = parseSeconds(rawEndSeconds);

  if (startSeconds === null || startSeconds < 0) {
    throw new ClipValidationError("invalid_start");
  }

  if (endSeconds === null) {
    throw new ClipValidationError("invalid_end");
  }

  if (endSeconds <= startSeconds) {
    throw new ClipValidationError("end_before_start");
  }

  const durationSeconds = Math.round((endSeconds - startSeconds) * 1000) / 1000;

  if (durationSeconds < MIN_CLIP_DURATION_SECONDS) {
    throw new ClipValidationError("too_short");
  }

  if (durationSeconds > MAX_CLIP_DURATION_SECONDS) {
    throw new ClipValidationError("too_long");
  }

  if (video.durationSeconds === null) {
    throw new ClipValidationError("duration_missing");
  }

  if (endSeconds > video.durationSeconds) {
    throw new ClipValidationError("beyond_duration");
  }

  return prisma.$transaction(async (tx) => {
    const clip = await tx.clip.create({
      data: {
        userId,
        videoId: video.id,
        title: getClipTitle(title, video.title),
        startSeconds,
        endSeconds,
        durationSeconds,
        status: ClipStatus.PENDING,
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
    });

    const job = await tx.processingJob.create({
      data: {
        userId,
        videoId: video.id,
        clipId: clip.id,
        type: JobType.CREATE_CLIP,
        status: JobStatus.PENDING,
      },
      select: {
        id: true,
        status: true,
        type: true,
      },
    });

    return {
      clip: {
        ...clip,
        createdAt: clip.createdAt.toISOString(),
      },
      job,
    };
  });
}
