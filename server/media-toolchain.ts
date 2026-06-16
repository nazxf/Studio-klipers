import { spawn } from "node:child_process";

export const MEDIA_TOOL_SETUP_GUIDANCE =
  "Install FFmpeg full build and add its bin folder to PATH, then restart terminal/dev server.";

const FFPROBE_TIMEOUT_MS = 15_000;
const FFPROBE_KILL_GRACE_MS = 5_000;
const MAX_CAPTURED_FFPROBE_OUTPUT = 8_000;

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

function getMediaToolBinFolder(override: string) {
  const normalized = override.replace(/\\/g, "/");
  const lastSlashIndex = normalized.lastIndexOf("/");
  const lastSegment = lastSlashIndex >= 0 ? normalized.slice(lastSlashIndex + 1) : normalized;

  if (!lastSegment.includes(".") || lastSlashIndex < 0) {
    return override;
  }

  return override.slice(0, lastSlashIndex);
}

function getPathDelimiter() {
  return process.platform === "win32" ? ";" : ":";
}

function getMediaToolSpawnEnv(tool: MediaToolName) {
  const override = getMediaToolPathOverride(tool);

  if (!override) {
    return undefined;
  }

  const binFolder = getMediaToolBinFolder(override);

  return {
    ...process.env,
    PATH: `${binFolder}${getPathDelimiter()}${process.env.PATH ?? ""}`,
  };
}

function appendCapturedOutput(currentOutput: string, nextChunk: Buffer) {
  const combinedOutput = currentOutput + nextChunk.toString("utf8");

  if (combinedOutput.length <= MAX_CAPTURED_FFPROBE_OUTPUT) {
    return combinedOutput;
  }

  return combinedOutput.slice(-MAX_CAPTURED_FFPROBE_OUTPUT);
}

function runFfprobe(args: string[], timeoutMessage: string) {
  return new Promise<string>((resolve, reject) => {
    const ffprobe = spawn(/*turbopackIgnore: true*/ getMediaToolCommand("ffprobe"), args, {
      env: getMediaToolSpawnEnv("ffprobe"),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let isSettled = false;
    let didTimeOut = false;
    let killGraceTimeout: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    function clearTimers() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (killGraceTimeout) {
        clearTimeout(killGraceTimeout);
        killGraceTimeout = null;
      }
    }

    function getTimeoutError() {
      return new Error(`${timeoutMessage}: ${stderr.trim() || "no stderr output"}`);
    }

    function settleReject(error: Error) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimers();
      reject(error);
    }

    function settleResolve(output: string) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimers();
      resolve(output);
    }

    timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      didTimeOut = true;
      ffprobe.kill();

      killGraceTimeout = setTimeout(() => {
        ffprobe.kill("SIGKILL");
        settleReject(getTimeoutError());
      }, FFPROBE_KILL_GRACE_MS);
    }, FFPROBE_TIMEOUT_MS);

    ffprobe.stdout.on("data", (chunk: Buffer) => {
      stdout = appendCapturedOutput(stdout, chunk);
    });

    ffprobe.stderr.on("data", (chunk: Buffer) => {
      stderr = appendCapturedOutput(stderr, chunk);
    });

    ffprobe.on("error", (error) => {
      if (didTimeOut) {
        settleReject(getTimeoutError());
        return;
      }

      settleReject(error);
    });

    ffprobe.on("close", (exitCode) => {
      if (didTimeOut) {
        settleReject(getTimeoutError());
        return;
      }

      if (exitCode !== 0) {
        settleReject(new Error(stderr.trim() || "ffprobe could not read media metadata."));
        return;
      }

      settleResolve(stdout);
    });
  });
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

export async function probeMp4DurationSeconds(filePath: string) {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ];

  const stdout = await runFfprobe(args, "ffprobe timed out while reading MP4 duration");
  const durationSeconds = Number(stdout.trim());

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("ffprobe returned an invalid MP4 duration.");
  }

  return Math.round(durationSeconds * 1000) / 1000;
}

export async function probeVideoDimensions(filePath: string) {
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

  const stdout = await runFfprobe(args, "ffprobe timed out while reading video dimensions");
  const [widthValue, heightValue] = stdout.trim().split("x");
  const width = Number(widthValue);
  const height = Number(heightValue);

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("ffprobe returned invalid video dimensions.");
  }

  return { height, width };
}
