/**
 * Clip worker polling loop — reusable module.
 *
 * Can be started from:
 * 1. Next.js instrumentation (auto-start with the server)
 * 2. Standalone CLI via `workers/clip-worker.ts`
 *
 * Only one instance should run per process. The module guards against
 * double-start via the `isRunning` flag.
 */

import { processNextClipJob } from "./clip-processing";

// Polling intervals (ms).
const IDLE_POLL_DELAY_MS = 2_000;
const ERROR_POLL_DELAY_MS = 5_000;
const BUSY_POLL_DELAY_MS = 250;

let isRunning = false;
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
    console.log(`[clip-worker] Completed job ${result.jobId} → ${result.outputKey}`);
    return { handled: true };
  }

  console.error(`[clip-worker] Failed job ${result.jobId}: ${result.errorMessage}`);
  return { handled: true };
}

/**
 * Start the clip worker polling loop. Safe to call multiple times — only the
 * first call actually starts the loop; subsequent calls are no-ops.
 */
export function startClipWorkerLoop() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  isShuttingDown = false;

  console.log("[clip-worker] Daemon started. Polling for jobs...");

  // Fire-and-forget — the loop runs until shutdown.
  void runLoop();
}

/**
 * Signal the worker loop to stop after the current tick completes.
 */
export function stopClipWorkerLoop() {
  if (!isRunning) {
    return;
  }

  isShuttingDown = true;
  console.log("[clip-worker] Shutdown requested. Finishing current job...");
}

async function runLoop() {
  while (!isShuttingDown) {
    let nextDelay = IDLE_POLL_DELAY_MS;

    try {
      const { handled } = await tick();
      nextDelay = handled ? BUSY_POLL_DELAY_MS : IDLE_POLL_DELAY_MS;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[clip-worker] Tick failed: ${message}`);
      nextDelay = ERROR_POLL_DELAY_MS;
    }

    if (isShuttingDown) {
      break;
    }

    await delay(nextDelay);
  }

  isRunning = false;
  console.log("[clip-worker] Daemon stopped.");
}
