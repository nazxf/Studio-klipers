import { pathToFileURL } from "node:url";

import { prisma } from "../lib/prisma";
import { processNextClipJob } from "../server/clip-processing";

// Polling intervals (ms).
const IDLE_POLL_DELAY_MS = 2_000;
const ERROR_POLL_DELAY_MS = 5_000;
const BUSY_POLL_DELAY_MS = 250;

let isShuttingDown = false;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, ms);
    // Allow process to exit cleanly during shutdown without waiting for the
    // full delay window.
    timeout.unref?.();
  });
}

async function tick() {
  const result = await processNextClipJob();

  if (result.status === "idle") {
    return { handled: false };
  }

  if (result.status === "processed") {
    console.log(`Completed clip job ${result.jobId}.`);
    console.log(`Output key: ${result.outputKey}`);
    console.log(`Output path: ${result.outputPath}`);
    return { handled: true };
  }

  console.error(`Failed clip job ${result.jobId}: ${result.errorMessage}`);
  return { handled: true };
}

async function runDaemon() {
  console.log("Clip worker daemon started. Polling for jobs...");

  while (!isShuttingDown) {
    let nextDelay = IDLE_POLL_DELAY_MS;

    try {
      const { handled } = await tick();
      nextDelay = handled ? BUSY_POLL_DELAY_MS : IDLE_POLL_DELAY_MS;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Clip worker tick failed: ${message}`);
      nextDelay = ERROR_POLL_DELAY_MS;
    }

    if (isShuttingDown) {
      break;
    }

    await delay(nextDelay);
  }

  console.log("Clip worker daemon stopped.");
}

function registerShutdownHandlers() {
  const stop = (signal: string) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}. Finishing current job before exit...`);
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  registerShutdownHandlers();

  runDaemon()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Clip worker daemon crashed: ${message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
