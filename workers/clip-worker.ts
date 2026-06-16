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
  // Keep the process alive until the worker loop finishes.
  const keepAlive = setInterval(() => {}, 60_000);

  async function shutdown(signal: string) {
    console.log(`Received ${signal}. Stopping worker loop...`);
    stopClipWorkerLoop();
    clearInterval(keepAlive);

    // Give the loop a moment to finish its current tick, then disconnect.
    // Node.js does not await async `beforeExit` handlers, so we handle
    // cleanup here in the signal handler instead.
    setTimeout(async () => {
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    }, 1_000);
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  startClipWorkerLoop();
}
