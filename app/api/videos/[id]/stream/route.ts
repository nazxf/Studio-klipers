import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveLocalUploadKey } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function streamFile({
  end,
  filePath,
  fileSize,
  start,
  status = 206,
}: {
  end: number;
  filePath: string;
  fileSize: number;
  start: number;
  status?: 200 | 206;
}) {
  const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Length": String(end - start + 1),
    "Content-Type": "video/mp4",
  });

  if (status === 206) {
    headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  }

  return new Response(stream as ReadableStream, {
    status,
    headers,
  });
}

function parseRange(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

  if (!match) {
    return "invalid" as const;
  }

  const [, startValue, endValue] = match;

  if (!startValue && !endValue) {
    return "invalid" as const;
  }

  if (!startValue) {
    const suffixLength = Number(endValue);

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return "invalid" as const;
    }

    return {
      start: Math.max(fileSize - suffixLength, 0),
      end: fileSize - 1,
    };
  }

  const start = Number(startValue);
  const end = endValue ? Number(endValue) : fileSize - 1;

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return "invalid" as const;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      sourceKey: true,
    },
  });

  if (!video?.sourceKey) {
    return new NextResponse(null, { status: 404 });
  }

  let filePath: string;

  try {
    filePath = resolveLocalUploadKey(video.sourceKey);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  let fileSize: number;

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return new NextResponse(null, { status: 404 });
    }

    fileSize = fileStat.size;

    if (fileSize <= 0) {
      return new NextResponse(null, { status: 404 });
    }
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const range = parseRange(request.headers.get("range"), fileSize);

  if (range === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${fileSize}`,
      },
    });
  }

  if (range) {
    return streamFile({
      end: range.end,
      filePath,
      fileSize,
      start: range.start,
    });
  }

  return streamFile({
    end: fileSize - 1,
    filePath,
    fileSize,
    start: 0,
    status: 200,
  });
}
