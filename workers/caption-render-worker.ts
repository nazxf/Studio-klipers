import { pathToFileURL } from "node:url";

import { prisma } from "../lib/prisma";
import { processNextCaptionRenderJob } from "../server/caption-render-processing";

async function main() {
  const result = await processNextCaptionRenderJob();

  if (result.status === "idle") {
    console.log("No pending caption render jobs.");
    return;
  }

  if (result.status === "processed") {
    console.log(`Completed caption render job ${result.jobId}.`);
    console.log(`Render ID: ${result.renderId}`);
    console.log(`Output key: ${result.outputKey}`);
    return;
  }

  console.error(`Failed caption render job ${result.jobId}.`);
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
