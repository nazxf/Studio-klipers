import { ClipStatus } from "@prisma/client";

import {
  getCaptionPresetStyleSnapshot,
  isCaptionPresetKey,
  normalizeCaptionPresetKey,
} from "@/lib/caption-presets";
import { prisma } from "@/lib/prisma";
import { getSafeClipProcessingErrorMessage } from "@/server/clip-errors";

export const MAX_SUBTITLE_SEGMENT_TEXT_LENGTH = 500;

export async function getSubtitleTrackForCompletedClipForUser({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}) {
  const clip = await prisma.clip.findFirst({
    where: {
      id: clipId,
      status: ClipStatus.COMPLETED,
      userId,
    },
    select: {
      id: true,
      subtitleTrack: {
        select: {
          id: true,
          clipId: true,
          status: true,
          source: true,
          languageCode: true,
          languageProbability: true,
          engine: true,
          modelName: true,
          presetKey: true,
          errorMessage: true,
          generatedAt: true,
          createdAt: true,
          updatedAt: true,
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
              id: true,
              startSeconds: true,
              endSeconds: true,
              text: true,
              generatedText: true,
              confidence: true,
              words: true,
              isEdited: true,
              sortOrder: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!clip?.subtitleTrack) {
    return null;
  }

  const track = clip.subtitleTrack;
  const presetKey = normalizeCaptionPresetKey(track.presetKey);

  return {
    id: track.id,
    clipId: track.clipId,
    status: track.status,
    source: track.source,
    languageCode: track.languageCode,
    languageProbability: track.languageProbability,
    engine: track.engine,
    modelName: track.modelName,
    presetKey,
    presetStyle: getCaptionPresetStyleSnapshot(presetKey),
    errorMessage: track.errorMessage
      ? getSafeClipProcessingErrorMessage(track.errorMessage)
      : null,
    generatedAt: track.generatedAt?.toISOString() ?? null,
    createdAt: track.createdAt.toISOString(),
    updatedAt: track.updatedAt.toISOString(),
    segments: track.segments.map((segment) => ({
      id: segment.id,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      text: segment.text,
      generatedText: segment.generatedText,
      confidence: segment.confidence,
      words: segment.words,
      isEdited: segment.isEdited,
      sortOrder: segment.sortOrder,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    })),
  };
}

function cleanSubtitleText(text: unknown) {
  if (typeof text !== "string") {
    return null;
  }

  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!cleanText || cleanText.length > MAX_SUBTITLE_SEGMENT_TEXT_LENGTH) {
    return null;
  }

  return cleanText;
}

export async function updateSubtitleSegmentTextForUser({
  clipId,
  segmentId,
  text,
  userId,
}: {
  clipId: string;
  segmentId: string;
  text: unknown;
  userId: string;
}) {
  const cleanText = cleanSubtitleText(text);

  if (!cleanText) {
    return {
      error: "invalid_text" as const,
      segment: null,
    };
  }

  const segment = await prisma.subtitleSegment.findFirst({
    where: {
      id: segmentId,
      track: {
        clip: {
          id: clipId,
          status: ClipStatus.COMPLETED,
          userId,
        },
      },
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!segment) {
    return {
      error: "not_found" as const,
      segment: null,
    };
  }

  const updatedSegment = await prisma.subtitleSegment.update({
    data: {
      isEdited: true,
      text: cleanText,
    },
    select: {
      id: true,
      isEdited: true,
      text: true,
      updatedAt: true,
    },
    where: {
      id: segment.id,
    },
  });

  return {
    error: null,
    segment: {
      id: updatedSegment.id,
      isEdited: updatedSegment.isEdited,
      text: updatedSegment.text,
      updatedAt: updatedSegment.updatedAt.toISOString(),
    },
  };
}

export async function updateSubtitleTrackPresetForUser({
  clipId,
  presetKey,
  userId,
}: {
  clipId: string;
  presetKey: unknown;
  userId: string;
}) {
  if (!isCaptionPresetKey(presetKey)) {
    return {
      error: "invalid_preset" as const,
      track: null,
    };
  }

  const track = await prisma.subtitleTrack.findFirst({
    where: {
      clip: {
        id: clipId,
        status: ClipStatus.COMPLETED,
        userId,
      },
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!track) {
    return {
      error: "not_found" as const,
      track: null,
    };
  }

  const presetStyle = getCaptionPresetStyleSnapshot(presetKey);
  const updatedTrack = await prisma.subtitleTrack.update({
    data: {
      presetKey,
      presetStyle,
    },
    select: {
      id: true,
      presetKey: true,
      updatedAt: true,
    },
    where: {
      id: track.id,
    },
  });

  const normalizedPresetKey = normalizeCaptionPresetKey(updatedTrack.presetKey);

  return {
    error: null,
    track: {
      id: updatedTrack.id,
      presetKey: normalizedPresetKey,
      presetStyle: getCaptionPresetStyleSnapshot(normalizedPresetKey),
      updatedAt: updatedTrack.updatedAt.toISOString(),
    },
  };
}
