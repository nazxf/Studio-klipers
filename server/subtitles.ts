import { ClipStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSafeClipProcessingErrorMessage } from "@/server/clip-errors";

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

  return {
    id: track.id,
    clipId: track.clipId,
    status: track.status,
    source: track.source,
    languageCode: track.languageCode,
    languageProbability: track.languageProbability,
    engine: track.engine,
    modelName: track.modelName,
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
