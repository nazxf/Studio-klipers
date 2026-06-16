/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * Used to auto-start the clip worker polling loop so there's no need to
 * manually run `npm run worker:clips` in a separate terminal.
 *
 * The worker only starts on the Node.js runtime (not edge). It can be
 * disabled by setting DISABLE_EMBEDDED_WORKER=true in the environment.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only start the worker on the server (Node.js runtime), not during build
  // or in edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Allow disabling the embedded worker for production deployments that
    // run the worker as a separate process.
    if (process.env.DISABLE_EMBEDDED_WORKER === "true") {
      console.log("[instrumentation] Embedded clip worker disabled via DISABLE_EMBEDDED_WORKER.");
      return;
    }

    try {
      const { startClipWorkerLoop, stopClipWorkerLoop } = await import(
        "./server/clip-worker-loop"
      );

      startClipWorkerLoop();

      // Graceful shutdown when Next.js process exits.
      process.once("SIGINT", () => stopClipWorkerLoop());
      process.once("SIGTERM", () => stopClipWorkerLoop());
    } catch (error) {
      console.error(
        "[instrumentation] Failed to start embedded clip worker:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
