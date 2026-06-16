import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { getLocalUploadTempRoot } from "@/server/storage";

const STALE_TEMP_UPLOAD_AGE_MS = 24 * 60 * 60 * 1000;

let cleanupRan = false;

/**
 * Removes leftover *.part files from the temp upload directory whose mtime is
 * older than {@link STALE_TEMP_UPLOAD_AGE_MS}. Stale temp files accumulate when
 * the server crashes mid-upload or a client aborts before the rename step in
 * `commitUploadToFinalPath`.
 *
 * Failures are swallowed and logged as warnings — cleanup must never block or
 * crash the host process.
 */
async function cleanupStaleTempUploads(
  maxAgeMs: number = STALE_TEMP_UPLOAD_AGE_MS,
): Promise<{ removed: number; scanned: number }> {
  const tempRoot = getLocalUploadTempRoot();
  const summary = { removed: 0, scanned: 0 };
  const now = Date.now();

  let entries: string[];

  try {
    entries = await readdir(tempRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return summary;
    }

    console.warn("[upload-cleanup] failed to read temp upload root", error);
    return summary;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".part")) {
      continue;
    }

    summary.scanned += 1;

    const entryPath = path.join(tempRoot, entry);

    try {
      const stats = await stat(entryPath);

      if (!stats.isFile()) {
        continue;
      }

      if (now - stats.mtimeMs < maxAgeMs) {
        continue;
      }

      await unlink(entryPath);
      summary.removed += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      console.warn(`[upload-cleanup] failed to clean ${entry}`, error);
    }
  }

  return summary;
}

/**
 * Best-effort one-shot cleanup invoked on first module load. Exposed so callers
 * can `void` the returned promise without awaiting it.
 */
/** Re-run cleanup every hour to catch stale files from long-running servers. */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function runCleanup() {
  cleanupStaleTempUploads()
    .then((summary) => {
      if (summary.removed > 0) {
        console.log(
          `[upload-cleanup] removed ${summary.removed} stale temp upload(s) (scanned ${summary.scanned})`,
        );
      }
    })
    .catch((error) => {
      console.warn("[upload-cleanup] sweep failed", error);
    });
}

export function scheduleStaleTempUploadCleanup(): void {
  if (cleanupRan) {
    return;
  }

  cleanupRan = true;

  // Run immediately on first call, then periodically.
  runCleanup();
  const interval = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  interval.unref(); // Don't prevent process exit.
}
