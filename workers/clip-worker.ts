/**
 * Standalone clip worker CLI entry point.
 *
 * Usage: npm run worker:clips (or: npx tsx workers/clip-worker.ts)
 *
 * This is kept for cases where you want to run the worker as a separate
 * process (e.g., production with dedicated worker containers). For local
 * development, the worker auto-starts with Next.js via instrumentation.ts.
 */

import { pathToFileURL } from "node:url";

import { prisma } from "../lib/prisma";
import { startClipWorkerLoop, stopClipWorkerLoop } from "../server/clip-worker-loop";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const stop = (signal: string) => {
    console.log(`Received ${signal}.`);
    stopClipWorkerLoop();
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  startClipWorkerLoop();

  // Keep the process alive until the worker loop finishes. The loop uses
  // unref'd timers so the process will exit once the loop stops.
  // We add a keep-alive interval that we clear on shutdown.
  const keepAlive = setInterval(() => {}, 60_000);

  process.once("beforeExit", async () => {
    clearInterval(keepAlive);
    await prisma.$disconnect();
  });
}
