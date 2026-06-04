import { stat } from "node:fs/promises";

import { prisma } from "../lib/prisma";
import {
  MEDIA_TOOL_SETUP_GUIDANCE,
  probeMp4DurationSeconds,
} from "../server/media-toolchain";
import { resolveLocalUploadKey } from "../server/storage";
import { checkMediaTool } from "./media-tool-checks";

type BackfillSummary = {
  checked: number;
  invalidSourceKey: number;
  missingFile: number;
  probeFailed: number;
  skippedWithoutSourceKey: number;
  updated: number;
};

async function main() {
  const ffprobe = await checkMediaTool("ffprobe");

  if (!ffprobe.isAvailable) {
    console.error("Cannot backfill durations because ffprobe is not available to Node.");
    console.error(MEDIA_TOOL_SETUP_GUIDANCE);
    process.exitCode = 1;
    return;
  }

  const videos = await prisma.video.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      sourceKey: true,
    },
    where: {
      durationSeconds: null,
      sourceKey: {
        not: null,
      },
    },
  });

  const skippedWithoutSourceKey = await prisma.video.count({
    where: {
      durationSeconds: null,
      sourceKey: null,
    },
  });

  const summary: BackfillSummary = {
    checked: videos.length,
    invalidSourceKey: 0,
    missingFile: 0,
    probeFailed: 0,
    skippedWithoutSourceKey,
    updated: 0,
  };

  for (const video of videos) {
    if (!video.sourceKey) {
      summary.skippedWithoutSourceKey += 1;
      continue;
    }

    let filePath: string;

    try {
      filePath = resolveLocalUploadKey(video.sourceKey);
    } catch {
      summary.invalidSourceKey += 1;
      console.warn(`Skipped video ${video.id}: invalid local source key.`);
      continue;
    }

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile() || fileStat.size <= 0) {
        summary.missingFile += 1;
        console.warn(`Skipped video ${video.id}: local source file is missing.`);
        continue;
      }
    } catch {
      summary.missingFile += 1;
      console.warn(`Skipped video ${video.id}: local source file is missing.`);
      continue;
    }

    try {
      const durationSeconds = await probeMp4DurationSeconds(filePath);

      await prisma.video.update({
        data: {
          durationSeconds,
        },
        where: {
          id: video.id,
        },
      });

      summary.updated += 1;
      console.log(`Updated video ${video.id}.`);
    } catch {
      summary.probeFailed += 1;
      console.warn(`Skipped video ${video.id}: duration could not be detected.`);
    }
  }

  console.log("Duration backfill summary");
  console.log(`Checked: ${summary.checked}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Skipped without source key: ${summary.skippedWithoutSourceKey}`);
  console.log(`Skipped missing file: ${summary.missingFile}`);
  console.log(`Skipped invalid source key: ${summary.invalidSourceKey}`);
  console.log(`Skipped probe failed: ${summary.probeFailed}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
