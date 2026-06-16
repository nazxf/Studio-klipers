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

/**
 * Build a Unicode-aware file name preserving the user's original title where
 * possible. Strips control characters and characters that can break filename
 * handling on common operating systems but keeps non-ASCII letters intact.
 */
function buildClipFileName({
  clipId,
  title,
}: {
  clipId: string;
  title: string;
}) {
  const cleaned = title
    .replace(/[\u0000-\u001f\u007f]/g, "") // control chars
    // eslint-disable-next-line no-useless-escape
    .replace(/[\\/:*?"<>|]/g, "") // illegal filename chars on Windows
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const baseName = cleaned || `clip-${clipId}`;

  return baseName.toLowerCase().endsWith(".mp4") ? baseName : `${baseName}.mp4`;
}

/**
 * Build a `Content-Disposition` header value that is safe against header
 * injection (ASCII-only fallback with quotes/backslashes stripped) AND keeps
 * the user's original Unicode title via the RFC 5987 `filename*` parameter.
 *
 * Returns both the canonical Unicode file name (for display/logging) and the
 * fully-formatted header value ready to be set on the response.
 */
export function getClipDownloadDisposition({
  clipId,
  title,
}: {
  clipId: string;
  title: string;
}) {
  const fileName = buildClipFileName({ clipId, title });

  // ASCII fallback: replace anything outside printable ASCII, plus quote and
  // backslash, with underscore. Guaranteed safe inside double-quoted form.
  const asciiSafe = fileName
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");

  const utf8Encoded = encodeURIComponent(fileName);

  return {
    fileName,
    headerValue: `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`,
  };
}
