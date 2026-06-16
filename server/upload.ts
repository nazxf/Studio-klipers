import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import busboy from "busboy";

import { prisma } from "@/lib/prisma";
import { probeMp4DurationSeconds } from "@/server/media-toolchain";
import {
  getLocalUploadTempPath,
  getLocalUploadTempRoot,
  getLocalVideoSourceKey,
  resolveLocalUploadKey,
} from "@/server/storage";

export const MAX_LOCAL_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_TITLE_LENGTH = 120;
const MP4_SIGNATURE_PREFIX_BYTES = 32;

const VALID_UPLOAD_ERROR_CODES = new Set([
  "missing_file",
  "empty_file",
  "too_large",
  "invalid_type",
  "invalid_mp4",
  "duration_unknown",
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

  const header = new TextDecoder("ascii").decode(bytes.slice(0, MP4_SIGNATURE_PREFIX_BYTES));

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
    invalid_type: "Only MP4 files are supported in the local MVP.",
    invalid_mp4: "The file does not look like a valid MP4 container.",
    duration_unknown:
      "The MP4 duration could not be detected. Verify local FFmpeg setup and try again.",
    storage: "The upload could not be saved locally. Try again.",
  };

  return messages[errorCode];
}

type StreamedUpload = {
  bytesWritten: number;
  fileName: string;
  tempPath: string;
  title?: string;
};

type UploadSource = {
  body: Readable;
  contentType: string | null;
};

function isMp4FileName(fileName: string) {
  return fileName.toLowerCase().endsWith(".mp4");
}

function isMp4MimeType(mimeType: string | undefined) {
  if (!mimeType) {
    return true;
  }

  return mimeType.toLowerCase() === "video/mp4";
}

/**
 * Streams a single multipart "file" field to a dedicated temp upload path
 * without buffering the whole MP4 in memory. Resolves with the temp file
 * metadata once the file is written and the multipart parser has closed.
 */
function streamUploadToTempFile({ body, contentType }: UploadSource): Promise<StreamedUpload> {
  return new Promise<StreamedUpload>((resolve, reject) => {
    if (!contentType || !contentType.toLowerCase().includes("multipart/form-data")) {
      reject(new UploadValidationError("invalid_type"));
      return;
    }

    const uploadId = randomUUID();
    let tempPath: string;

    try {
      tempPath = getLocalUploadTempPath(uploadId);
    } catch {
      reject(new UploadValidationError("storage"));
      return;
    }

    let parser: ReturnType<typeof busboy>;

    try {
      parser = busboy({
        headers: { "content-type": contentType },
        limits: {
          fields: 5,
          files: 1,
          fileSize: MAX_LOCAL_UPLOAD_BYTES,
        },
      });
    } catch {
      reject(new UploadValidationError("invalid_type"));
      return;
    }

    let writeStream: ReturnType<typeof createWriteStream> | null = null;
    let title: string | undefined;
    let fileName = "original.mp4";
    let bytesWritten = 0;
    let sawFile = false;
    let isSettled = false;
    let fileWriteFinished = false;
    let parserClosed = false;
    let validationError: UploadValidationError | null = null;
    let streamedUpload: StreamedUpload | null = null;
    let signaturePrefix = Buffer.alloc(0);
    let signatureChecked = false;

    function cleanupTempFile() {
      void unlink(tempPath).catch(() => undefined);
    }

    function maybeResolve() {
      if (
        isSettled ||
        validationError ||
        !fileWriteFinished ||
        !parserClosed ||
        !streamedUpload
      ) {
        return;
      }

      isSettled = true;
      resolve(streamedUpload);
    }

    function settleReject(error: Error) {
      if (isSettled) {
        return;
      }

      isSettled = true;

      const finalize = () => {
        cleanupTempFile();
        body.unpipe(parser);
        if (!body.destroyed) {
          body.destroy(error);
        }
        parser.destroy();
        reject(error);
      };

      if (writeStream && !writeStream.closed) {
        writeStream.once("close", finalize);
        writeStream.destroy();
        return;
      }

      finalize();
    }

    function failValidation(code: string) {
      if (!validationError) {
        validationError = new UploadValidationError(code);
      }

      settleReject(validationError);
    }

    parser.on("field", (name, value) => {
      if (name === "title" && typeof value === "string") {
        title = value;
      }
    });

    parser.on("file", (name, fileStream, info) => {
      if (name !== "file" || sawFile) {
        fileStream.resume();

        if (sawFile) {
          failValidation("invalid_type");
        }

        return;
      }

      sawFile = true;
      fileName = sanitizeFileName(info.filename ?? "original.mp4");

      if (!isMp4FileName(fileName) || !isMp4MimeType(info.mimeType)) {
        fileStream.resume();
        failValidation("invalid_type");
        return;
      }

      const target = createWriteStream(tempPath);
      writeStream = target;

      target.on("error", () => {
        settleReject(new UploadValidationError("storage"));
      });

      fileStream.on("limit", () => {
        failValidation("too_large");
      });

      fileStream.on("data", (chunk: Buffer) => {
        if (!signatureChecked) {
          if (signaturePrefix.length < MP4_SIGNATURE_PREFIX_BYTES) {
            signaturePrefix = Buffer.concat([
              signaturePrefix,
              chunk.subarray(0, MP4_SIGNATURE_PREFIX_BYTES - signaturePrefix.length),
            ]);
          }

          if (signaturePrefix.length >= MP4_SIGNATURE_PREFIX_BYTES) {
            signatureChecked = true;

            if (!isMp4Signature(signaturePrefix)) {
              failValidation("invalid_mp4");
              return;
            }
          }
        }

        bytesWritten += chunk.length;
      });

      fileStream.on("error", () => {
        settleReject(new UploadValidationError("storage"));
      });

      // Pipe raw bytes to disk; the data listener above only inspects them.
      fileStream.pipe(target);

      target.on("finish", () => {
        if (isSettled || validationError) {
          return;
        }

        fileWriteFinished = true;

        if (!signatureChecked && !isMp4Signature(signaturePrefix)) {
          failValidation("invalid_mp4");
          return;
        }

        if (bytesWritten <= 0) {
          failValidation("empty_file");
          return;
        }

        streamedUpload = {
          bytesWritten,
          fileName,
          tempPath,
          title,
        };
        maybeResolve();
      });
    });

    parser.on("filesLimit", () => {
      failValidation("invalid_type");
    });

    parser.on("error", () => {
      settleReject(new UploadValidationError("storage"));
    });

    parser.on("close", () => {
      parserClosed = true;

      if (!sawFile) {
        failValidation("missing_file");
        return;
      }

      maybeResolve();
    });

    body.on("error", () => {
      settleReject(new UploadValidationError("storage"));
    });

    body.pipe(parser);
  });
}

async function commitUploadToFinalPath({
  tempPath,
  bytesWritten,
  finalPath,
}: {
  bytesWritten: number;
  finalPath: string;
  tempPath: string;
}) {
  await mkdir(path.dirname(finalPath), { recursive: true });
  await unlink(finalPath).catch(() => undefined);

  try {
    await rename(tempPath, finalPath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      throw error;
    }
  }

  // Cross-device fallback: copy then remove the temp file, and verify size.
  await copyFile(tempPath, finalPath);

  const finalStat = await stat(finalPath);

  if (finalStat.size !== bytesWritten) {
    await unlink(finalPath).catch(() => undefined);
    throw new Error("Copied upload size mismatch.");
  }

  await unlink(tempPath).catch(() => undefined);
}

export async function saveLocalMp4Upload({
  source,
  title,
  userId,
}: {
  source: UploadSource;
  title?: string;
  userId: string;
}) {
  await mkdir(getLocalUploadTempRoot(), { recursive: true });

  const streamed = await streamUploadToTempFile(source);

  const videoId = randomUUID();
  const sourceKey = getLocalVideoSourceKey(userId, videoId);

  let finalPath: string;

  try {
    finalPath = resolveLocalUploadKey(sourceKey);
  } catch {
    await unlink(streamed.tempPath).catch(() => undefined);
    throw new UploadValidationError("storage");
  }

  let durationSeconds: number;

  try {
    durationSeconds = await probeMp4DurationSeconds(streamed.tempPath);
  } catch {
    await unlink(streamed.tempPath).catch(() => undefined);
    throw new UploadValidationError("duration_unknown");
  }

  try {
    await commitUploadToFinalPath({
      bytesWritten: streamed.bytesWritten,
      finalPath,
      tempPath: streamed.tempPath,
    });
  } catch {
    await unlink(streamed.tempPath).catch(() => undefined);
    await unlink(finalPath).catch(() => undefined);
    throw new UploadValidationError("storage");
  }

  const videoTitle = getUploadTitle(title ?? streamed.title, streamed.fileName);

  try {
    return await prisma.video.create({
      data: {
        id: videoId,
        userId,
        title: videoTitle,
        fileName: streamed.fileName,
        mimeType: "video/mp4",
        sizeBytes: BigInt(streamed.bytesWritten),
        durationSeconds,
        sourceKey,
        // The file is fully written, atomically committed to its final path,
        // and its duration has been probed by ffprobe. The video is ready for
        // streaming and clipping.
        status: "READY",
      },
    });
  } catch (error) {
    await unlink(finalPath).catch(() => undefined);
    throw error;
  }
}
