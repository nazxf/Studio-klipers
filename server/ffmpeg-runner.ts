import { spawn } from "node:child_process";

import { getFfmpegCommand } from "@/server/media-toolchain";

const DEFAULT_FFMPEG_KILL_GRACE_MS = 5_000;

type RunFfmpegProcessOptions = {
  args: string[];
  cwd?: string;
  failureMessage: string;
  killGraceMs?: number;
  maxCapturedStderr?: number;
  timeoutMessage: string;
  timeoutMs: number;
};

function appendCapturedOutput({
  currentOutput,
  maxCapturedStderr,
  nextChunk,
}: {
  currentOutput: string;
  maxCapturedStderr: number;
  nextChunk: Buffer;
}) {
  const combinedOutput = currentOutput + nextChunk.toString("utf8");

  if (combinedOutput.length <= maxCapturedStderr) {
    return combinedOutput;
  }

  return combinedOutput.slice(-maxCapturedStderr);
}

export function runFfmpegProcess({
  args,
  cwd,
  failureMessage,
  killGraceMs = DEFAULT_FFMPEG_KILL_GRACE_MS,
  maxCapturedStderr = 8_000,
  timeoutMessage,
  timeoutMs,
}: RunFfmpegProcessOptions) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(/*turbopackIgnore: true*/ getFfmpegCommand(), args, {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    let isSettled = false;
    let didTimeOut = false;
    let killGraceTimeout: NodeJS.Timeout | null = null;

    function clearTimers(timeout: NodeJS.Timeout) {
      clearTimeout(timeout);

      if (killGraceTimeout) {
        clearTimeout(killGraceTimeout);
        killGraceTimeout = null;
      }
    }

    function settleReject(timeout: NodeJS.Timeout, error: Error) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimers(timeout);
      reject(error);
    }

    const timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      didTimeOut = true;
      ffmpeg.kill();

      killGraceTimeout = setTimeout(() => {
        ffmpeg.kill("SIGKILL");
        settleReject(
          timeout,
          new Error(`${timeoutMessage}: ${stderr.trim() || "no stderr output"}`),
        );
      }, killGraceMs);
    }, timeoutMs);

    ffmpeg.stderr?.on("data", (chunk: Buffer) => {
      stderr = appendCapturedOutput({
        currentOutput: stderr,
        maxCapturedStderr,
        nextChunk: chunk,
      });
    });

    ffmpeg.on("error", (error) => {
      if (didTimeOut) {
        settleReject(
          timeout,
          new Error(`${timeoutMessage}: ${stderr.trim() || error.message}`),
        );
        return;
      }

      settleReject(timeout, error);
    });

    ffmpeg.on("close", (exitCode) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimers(timeout);

      if (didTimeOut) {
        reject(new Error(`${timeoutMessage}: ${stderr.trim() || "no stderr output"}`));
        return;
      }

      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${failureMessage} with exit code ${exitCode ?? "unknown"}: ${
            stderr.trim() || "no stderr output"
          }`,
        ),
      );
    });
  });
}
