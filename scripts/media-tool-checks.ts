import { spawn } from "node:child_process";

import {
  getFfmpegCommand,
  getFfprobeCommand,
  getMediaToolSource,
} from "../server/media-toolchain";

const VERSION_TIMEOUT_MS = 10_000;
const VERSION_KILL_GRACE_MS = 5_000;
const MAX_CAPTURED_VERSION_OUTPUT = 8_000;

type MediaToolName = "ffmpeg" | "ffprobe";

type MediaToolCheck = {
  errorMessage: string | null;
  isAvailable: boolean;
  source: "env" | "path";
  tool: MediaToolName;
  versionLine: string | null;
};

function getCommand(tool: MediaToolName) {
  return tool === "ffmpeg" ? getFfmpegCommand() : getFfprobeCommand();
}

function getSafeSpawnErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/\s+/g, " ").trim();
  }

  return String(error).replace(/\s+/g, " ").trim();
}

function readVersionLine(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? null;
}

function appendCapturedOutput(currentOutput: string, nextChunk: Buffer) {
  const combinedOutput = currentOutput + nextChunk.toString("utf8");

  if (combinedOutput.length <= MAX_CAPTURED_VERSION_OUTPUT) {
    return combinedOutput;
  }

  return combinedOutput.slice(-MAX_CAPTURED_VERSION_OUTPUT);
}

function readMediaToolVersion(tool: MediaToolName) {
  const command = getCommand(tool);

  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, ["-version"], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let isSettled = false;
    let didTimeOut = false;
    let killGraceTimeout: NodeJS.Timeout | null = null;

    function clearTimers() {
      clearTimeout(timeout);

      if (killGraceTimeout) {
        clearTimeout(killGraceTimeout);
        killGraceTimeout = null;
      }
    }

    function settleReject(error: Error) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimers();
      reject(error);
    }

    function settleResolve(versionLine: string) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimers();
      resolve(versionLine);
    }

    function getTimeoutError() {
      return new Error(`${tool} timed out while reading version.`);
    }

    const timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      didTimeOut = true;
      child.kill();
      killGraceTimeout = setTimeout(() => {
        child.kill("SIGKILL");
        settleReject(getTimeoutError());
      }, VERSION_KILL_GRACE_MS);
    }, VERSION_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendCapturedOutput(stdout, chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendCapturedOutput(stderr, chunk);
    });

    child.on("error", (error) => {
      if (didTimeOut) {
        settleReject(getTimeoutError());
        return;
      }

      settleReject(error);
    });

    child.on("close", (exitCode) => {
      if (didTimeOut) {
        settleReject(getTimeoutError());
        return;
      }

      if (exitCode !== 0) {
        settleReject(new Error(stderr.trim() || `${tool} exited with code ${exitCode ?? "unknown"}.`));
        return;
      }

      const versionLine = readVersionLine(stdout) ?? readVersionLine(stderr);

      if (!versionLine) {
        settleReject(new Error(`${tool} did not print version output.`));
        return;
      }

      settleResolve(versionLine);
    });
  });
}

export async function checkMediaTool(tool: MediaToolName): Promise<MediaToolCheck> {
  try {
    const versionLine = await readMediaToolVersion(tool);

    return {
      errorMessage: null,
      isAvailable: true,
      source: getMediaToolSource(tool),
      tool,
      versionLine,
    };
  } catch (error) {
    return {
      errorMessage: getSafeSpawnErrorMessage(error),
      isAvailable: false,
      source: getMediaToolSource(tool),
      tool,
      versionLine: null,
    };
  }
}

export async function checkMediaToolchain() {
  const [ffmpeg, ffprobe] = await Promise.all([
    checkMediaTool("ffmpeg"),
    checkMediaTool("ffprobe"),
  ]);

  return {
    ffmpeg,
    ffprobe,
    isReady: ffmpeg.isAvailable && ffprobe.isAvailable,
  };
}
