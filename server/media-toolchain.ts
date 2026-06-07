import { spawn } from "node:child_process";
import path from "node:path";

export const MEDIA_TOOL_SETUP_GUIDANCE =
  "Install FFmpeg full build and add its bin folder to PATH, then restart terminal/dev server.";

const FFPROBE_TIMEOUT_MS = 15_000;

type MediaToolName = "ffmpeg" | "ffprobe";

function getMediaToolCommand(tool: MediaToolName) {
  if (tool === "ffmpeg") {
    return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
  }

  return process.env.FFPROBE_PATH?.trim() || "ffprobe";
}

function getMediaToolPathOverride(tool: MediaToolName) {
  const envName = tool === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";

  return process.env[envName]?.trim() || null;
}

function getMediaToolSpawnEnv(tool: MediaToolName) {
  const override = getMediaToolPathOverride(tool);

  if (!override) {
    return undefined;
  }

  const binFolder = path.extname(override) ? path.dirname(override) : override;

  return {
    ...process.env,
    PATH: `${binFolder}${path.delimiter}${process.env.PATH ?? ""}`,
  };
}

export function getMediaToolSource(tool: MediaToolName): "env" | "path" {
  return getMediaToolPathOverride(tool) ? "env" : "path";
}

export function getFfmpegCommand() {
  return getMediaToolCommand("ffmpeg");
}

export function getFfprobeCommand() {
  return getMediaToolCommand("ffprobe");
}

export function probeMp4DurationSeconds(filePath: string) {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ];

  return new Promise<number>((resolve, reject) => {
    const ffprobe = spawn("ffprobe", args, {
      env: getMediaToolSpawnEnv("ffprobe"),
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
      ffprobe.kill();
      reject(new Error("ffprobe timed out while reading MP4 duration."));
    }, FFPROBE_TIMEOUT_MS);

    ffprobe.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    ffprobe.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    ffprobe.on("error", (error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      reject(error);
    });

    ffprobe.on("close", (exitCode) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(new Error(stderr.trim() || "ffprobe could not read MP4 duration."));
        return;
      }

      const durationSeconds = Number(stdout.trim());

      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        reject(new Error("ffprobe returned an invalid MP4 duration."));
        return;
      }

      resolve(Math.round(durationSeconds * 1000) / 1000);
    });
  });
}

export function probeVideoDimensions(filePath: string) {
  const args = [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=s=x:p=0",
    filePath,
  ];

  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const ffprobe = spawn("ffprobe", args, {
      env: getMediaToolSpawnEnv("ffprobe"),
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
      ffprobe.kill();
      reject(new Error("ffprobe timed out while reading video dimensions."));
    }, FFPROBE_TIMEOUT_MS);

    ffprobe.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    ffprobe.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    ffprobe.on("error", (error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      reject(error);
    });

    ffprobe.on("close", (exitCode) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(new Error(stderr.trim() || "ffprobe could not read video dimensions."));
        return;
      }

      const [widthValue, heightValue] = stdout.trim().split("x");
      const width = Number(widthValue);
      const height = Number(heightValue);

      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width <= 0 ||
        height <= 0
      ) {
        reject(new Error("ffprobe returned invalid video dimensions."));
        return;
      }

      resolve({ height, width });
    });
  });
}
