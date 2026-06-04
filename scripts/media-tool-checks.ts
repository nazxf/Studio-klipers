import { spawn } from "node:child_process";

import {
  getFfmpegCommand,
  getFfprobeCommand,
  getMediaToolSource,
} from "../server/media-toolchain";

const VERSION_TIMEOUT_MS = 10_000;

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

function readMediaToolVersion(tool: MediaToolName) {
  const command = getCommand(tool);

  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, ["-version"], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      child.kill();
      reject(new Error(`${tool} timed out while reading version.`));
    }, VERSION_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(new Error(stderr.trim() || `${tool} exited with code ${exitCode ?? "unknown"}.`));
        return;
      }

      const versionLine = readVersionLine(stdout) ?? readVersionLine(stderr);

      if (!versionLine) {
        reject(new Error(`${tool} did not print version output.`));
        return;
      }

      resolve(versionLine);
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
