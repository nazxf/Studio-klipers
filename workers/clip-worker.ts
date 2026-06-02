import { pathToFileURL } from "node:url";

import { prisma } from "../lib/prisma";
import { processNextClipJob } from "../server/clip-processing";

async function main() {
  const result = await processNextClipJob();

  if (result.status === "idle") {
    console.log("No pending clip jobs.");
    return;
  }

  if (result.status === "processed") {
    console.log(`Completed clip job ${result.jobId}.`);
    console.log(`Output key: ${result.outputKey}`);
    console.log(`Output path: ${result.outputPath}`);
    return;
  }

  console.error(`Failed clip job ${result.jobId}.`);
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
