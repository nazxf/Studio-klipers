import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getLocalVideoSourceKey, resolveLocalUploadKey } from "@/server/storage";

export const MAX_LOCAL_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_TITLE_LENGTH = 120;

const VALID_UPLOAD_ERROR_CODES = new Set([
  "missing_file",
  "empty_file",
  "too_large",
  "invalid_type",
  "invalid_mp4",
  "storage",
]);

export class UploadValidationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^\w.\- ]+/g, "").trim();

  return baseName || "original.mp4";
}

function getTitleFromFile(fileName: string) {
  const baseName = sanitizeFileName(fileName).replace(/\.mp4$/i, "").trim();

  return baseName || "Untitled video";
}

function getUploadTitle(title: string | undefined, fileName: string) {
  const cleanTitle = title?.replace(/\s+/g, " ").trim();

  if (cleanTitle) {
    return cleanTitle.slice(0, MAX_VIDEO_TITLE_LENGTH);
  }

  return getTitleFromFile(fileName).slice(0, MAX_VIDEO_TITLE_LENGTH);
}

function isMp4Signature(bytes: Uint8Array) {
  if (bytes.length < 12) {
    return false;
  }

  const header = new TextDecoder("ascii").decode(bytes.slice(0, 32));

  return header.includes("ftyp");
}

export function getUploadErrorMessage(errorCode?: string) {
  if (!errorCode || !VALID_UPLOAD_ERROR_CODES.has(errorCode)) {
    return null;
  }

  const messages: Record<string, string> = {
    missing_file: "Choose an MP4 file before uploading.",
    empty_file: "The selected file is empty.",
    too_large: "Use an MP4 up to 100 MB for local development storage.",
    invalid_type: "Only MP4 files are supported in Phase 4A.",
    invalid_mp4: "The file does not look like a valid MP4 container.",
    storage: "The upload could not be saved locally. Try again.",
  };

  return messages[errorCode];
}

export async function saveLocalMp4Upload({
  file,
  title,
  userId,
}: {
  file: File;
  title?: string;
  userId: string;
}) {
  if (!file || !(file instanceof File)) {
    throw new UploadValidationError("missing_file");
  }

  const fileName = sanitizeFileName(file.name);

  if (file.size <= 0) {
    throw new UploadValidationError("empty_file");
  }

  if (file.size > MAX_LOCAL_UPLOAD_BYTES) {
    throw new UploadValidationError("too_large");
  }

  const fileType = file.type.toLowerCase();

  if (!fileName.toLowerCase().endsWith(".mp4") || (fileType && fileType !== "video/mp4")) {
    throw new UploadValidationError("invalid_type");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!isMp4Signature(bytes)) {
    throw new UploadValidationError("invalid_mp4");
  }

  const videoId = randomUUID();
  const sourceKey = getLocalVideoSourceKey(userId, videoId);
  const localPath = resolveLocalUploadKey(sourceKey);
  const videoTitle = getUploadTitle(title, fileName);

  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, bytes);

  try {
    return await prisma.video.create({
      data: {
        id: videoId,
        userId,
        title: videoTitle,
        fileName,
        mimeType: "video/mp4",
        sizeBytes: BigInt(file.size),
        sourceKey,
        status: "UPLOADED",
      },
    });
  } catch (error) {
    await unlink(localPath).catch(() => undefined);
    throw error;
  }
}
