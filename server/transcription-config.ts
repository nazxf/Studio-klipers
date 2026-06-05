import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseEnvValue(value: string) {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function loadLocalEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = parseEnvValue(trimmedLine.slice(equalsIndex + 1));
  }
}

loadLocalEnvFile();

export const TRANSCRIPTION_SETUP_GUIDANCE =
  "Install transcription dependencies with: python -m pip install -r requirements-transcription.txt";

export type TranscriptionConfig = {
  computeType: string;
  device: string;
  language: string | null;
  model: string;
  pythonCommand: string;
};

function readEnvValue(name: string) {
  return process.env[name]?.trim() || "";
}

export function readTranscriptionConfig(): TranscriptionConfig {
  return {
    computeType: readEnvValue("TRANSCRIPTION_COMPUTE_TYPE") || "int8",
    device: readEnvValue("TRANSCRIPTION_DEVICE") || "cpu",
    language: readEnvValue("TRANSCRIPTION_LANGUAGE") || null,
    model: readEnvValue("TRANSCRIPTION_MODEL") || "base",
    pythonCommand: readEnvValue("PYTHON_PATH") || "python",
  };
}

export function getPythonCommand() {
  return readTranscriptionConfig().pythonCommand;
}

export function formatTranscriptionLanguage(language: string | null) {
  return language || "auto-detect";
}
