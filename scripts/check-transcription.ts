import { spawn } from "node:child_process";

import { MEDIA_TOOL_SETUP_GUIDANCE } from "../server/media-toolchain";
import {
  formatTranscriptionLanguage,
  getPythonCommand,
  readTranscriptionConfig,
  TRANSCRIPTION_SETUP_GUIDANCE,
} from "../server/transcription-config";
import { checkMediaToolchain } from "./media-tool-checks";

const COMMAND_TIMEOUT_MS = 15_000;

type CommandResult = {
  errorMessage: string | null;
  exitCode: number | null;
  stderr: string;
  stdout: string;
  timedOut: boolean;
};

function runCommand(command: string, args: string[]) {
  return new Promise<CommandResult>((resolve) => {
    let child: ReturnType<typeof spawn>;
    let stdout = "";
    let stderr = "";
    let isSettled = false;

    try {
      child = spawn(command, args, {
        windowsHide: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.replace(/\s+/g, " ").trim() : String(error);

      resolve({
        errorMessage,
        exitCode: null,
        stderr,
        stdout,
        timedOut: false,
      });
      return;
    }

    const timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      child.kill();
      resolve({
        errorMessage: `${command} timed out.`,
        exitCode: null,
        stderr,
        stdout,
        timedOut: true,
      });
    }, COMMAND_TIMEOUT_MS);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      resolve({
        errorMessage: error.message.replace(/\s+/g, " ").trim(),
        exitCode: null,
        stderr,
        stdout,
        timedOut: false,
      });
    });

    child.on("close", (exitCode) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      resolve({
        errorMessage: null,
        exitCode,
        stderr,
        stdout,
        timedOut: false,
      });
    });
  });
}

function readFirstLine(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? null;
}

function readLastLine(output: string) {
  return (
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? null
  );
}

async function checkPython() {
  const pythonCommand = getPythonCommand();
  const result = await runCommand(pythonCommand, ["--version"]);
  const versionLine = readFirstLine(result.stdout) ?? readFirstLine(result.stderr);

  if (result.exitCode === 0 && versionLine) {
    console.log(`OK python: ${versionLine}`);
    console.log(`Python executable: ${pythonCommand}`);
    return true;
  }

  console.error("MISSING python: Node could not run python --version.");
  console.error(`Reason: ${result.errorMessage ?? readFirstLine(result.stderr) ?? "unknown error"}`);
  console.error("Install Python 3.9+ or set PYTHON_PATH in .env.local.");
  return false;
}

async function checkFasterWhisperImport() {
  const result = await runCommand(getPythonCommand(), [
    "-c",
    "import faster_whisper; print(getattr(faster_whisper, '__version__', 'unknown'))",
  ]);
  const versionLine = readFirstLine(result.stdout);

  if (result.exitCode === 0) {
    console.log(`OK faster-whisper: import succeeded (${versionLine ?? "version unknown"}).`);
    return true;
  }

  console.error("MISSING faster-whisper: Python could not import faster_whisper.");
  console.error(`Reason: ${result.errorMessage ?? readLastLine(result.stderr) ?? "unknown error"}`);
  console.error(TRANSCRIPTION_SETUP_GUIDANCE);
  return false;
}

async function checkMediaReadiness() {
  const result = await checkMediaToolchain();

  for (const check of [result.ffmpeg, result.ffprobe]) {
    const source = check.source === "env" ? (check.tool === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH") : "PATH";

    if (check.isAvailable) {
      console.log(`OK ${check.tool}: Node can spawn it from ${source}.`);
      console.log(`Version: ${check.versionLine}`);
      continue;
    }

    console.error(`MISSING ${check.tool}: Node could not spawn it from ${source}.`);
    console.error(`Reason: ${check.errorMessage ?? "unknown error"}`);
  }

  if (!result.isReady) {
    console.error(MEDIA_TOOL_SETUP_GUIDANCE);
  }

  return result.isReady;
}

async function main() {
  console.log("Transcription readiness preflight");
  console.log("This check does not download or run a transcription model.");

  const config = readTranscriptionConfig();

  console.log(`Model: ${config.model}`);
  console.log(`Device: ${config.device}`);
  console.log(`Compute type: ${config.computeType}`);
  console.log(`Language: ${formatTranscriptionLanguage(config.language)}`);
  console.log(`Python executable: ${config.pythonCommand}`);

  const pythonReady = await checkPython();
  const fasterWhisperReady = pythonReady ? await checkFasterWhisperImport() : false;
  const mediaReady = await checkMediaReadiness();

  if (!pythonReady || !fasterWhisperReady || !mediaReady) {
    process.exitCode = 1;
    return;
  }

  console.log("Transcription readiness check passed.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/\s+/g, " ").trim());
  console.error(TRANSCRIPTION_SETUP_GUIDANCE);
  process.exitCode = 1;
});
