import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

const startedAt = Date.now();

type CheckResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, latencyMs: Date.now() - start, error: message };
  }
}

async function checkFfmpeg(): Promise<CheckResult> {
  const start = Date.now();
  const command = process.env.FFMPEG_PATH?.trim() || "ffmpeg";

  try {
    await execFileAsync(command, ["-version"], {
      timeout: 5_000,
      windowsHide: true,
    });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, latencyMs: Date.now() - start, error: message };
  }
}

export async function GET() {
  const [database, ffmpeg] = await Promise.all([
    checkDatabase(),
    checkFfmpeg(),
  ]);

  const healthy = database.ok && ffmpeg.ok;

  const body = {
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks: {
      database,
      ffmpeg,
    },
  };

  return Response.json(body, {
    status: healthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
