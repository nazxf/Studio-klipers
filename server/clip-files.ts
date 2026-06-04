import { stat } from "node:fs/promises";

import { ClipStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getLocalClipOutputKey, resolveLocalUploadKey } from "@/server/storage";

export type ResolvedClipOutput = {
  filePath: string;
  fileSize: number;
  outputKey: string;
  title: string;
};

export async function resolveCompletedClipOutputForUser({
  clipId,
  userId,
}: {
  clipId: string;
  userId: string;
}): Promise<ResolvedClipOutput | null> {
  const clip = await prisma.clip.findFirst({
    where: {
      id: clipId,
      userId,
    },
    select: {
      id: true,
      outputKey: true,
      status: true,
      title: true,
    },
  });

  if (!clip || clip.status !== ClipStatus.COMPLETED || !clip.outputKey) {
    return null;
  }

  const expectedOutputKey = getLocalClipOutputKey(userId, clip.id);

  if (clip.outputKey !== expectedOutputKey) {
    return null;
  }

  let filePath: string;

  try {
    filePath = resolveLocalUploadKey(clip.outputKey);
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
      outputKey: clip.outputKey,
      title: clip.title,
    };
  } catch {
    return null;
  }
}

export function getClipDownloadFileName({
  clipId,
  title,
}: {
  clipId: string;
  title: string;
}) {
  const safeTitle = title
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const baseName = safeTitle || `clip-${clipId}`;

  return baseName.toLowerCase().endsWith(".mp4") ? baseName : `${baseName}.mp4`;
}
