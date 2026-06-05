import { pathToFileURL } from "node:url";

import { prisma } from "../lib/prisma";
import { processNextSubtitleJob } from "../server/subtitle-processing";

async function main() {
  const result = await processNextSubtitleJob();

  if (result.status === "idle") {
    console.log("No pending subtitle jobs.");
    return;
  }

  if (result.status === "processed") {
    console.log(`Completed subtitle job ${result.jobId}.`);
    console.log(`Track ID: ${result.trackId}`);
    console.log(`Segments: ${result.segmentCount}`);
    return;
  }

  console.error(`Failed subtitle job ${result.jobId}.`);
  console.error(result.errorMessage);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
