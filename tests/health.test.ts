import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

// Mock child_process
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// Mock node:util promisify to return our mock
vi.mock("node:util", () => ({
  promisify: (fn: unknown) => fn,
}));

import { prisma } from "@/lib/prisma";
import { execFile } from "node:child_process";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 healthy when DB and FFmpeg are OK", async () => {
    // Mock DB success
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ 1: 1 }]);
    // Mock FFmpeg success
    (execFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: "ffmpeg version 6.0",
      stderr: "",
    });

    // Dynamic import to pick up mocks
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.database.ok).toBe(true);
    expect(body.checks.ffmpeg.ok).toBe(true);
    expect(body.checks.database.latencyMs).toBeTypeOf("number");
    expect(body.checks.ffmpeg.latencyMs).toBeTypeOf("number");
    expect(body.timestamp).toBeDefined();
    expect(body.uptimeSeconds).toBeTypeOf("number");
  });

  it("returns 503 degraded when DB fails", async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection refused"),
    );
    (execFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: "ffmpeg version 6.0",
      stderr: "",
    });

    // Re-import with fresh module
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(new Error("Connection refused")),
      },
    }));
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn().mockResolvedValue({ stdout: "ffmpeg version 6.0", stderr: "" }),
    }));
    vi.doMock("node:util", () => ({
      promisify: (fn: unknown) => fn,
    }));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.database.ok).toBe(false);
    expect(body.checks.database.error).toContain("Connection refused");
    expect(body.checks.ffmpeg.ok).toBe(true);
  });

  it("returns 503 degraded when FFmpeg fails", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
      },
    }));
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn().mockRejectedValue(new Error("ffmpeg not found")),
    }));
    vi.doMock("node:util", () => ({
      promisify: (fn: unknown) => fn,
    }));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.database.ok).toBe(true);
    expect(body.checks.ffmpeg.ok).toBe(false);
    expect(body.checks.ffmpeg.error).toContain("ffmpeg not found");
  });

  it("includes Cache-Control: no-store header", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
      },
    }));
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn().mockResolvedValue({ stdout: "ffmpeg version 6.0", stderr: "" }),
    }));
    vi.doMock("node:util", () => ({
      promisify: (fn: unknown) => fn,
    }));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
