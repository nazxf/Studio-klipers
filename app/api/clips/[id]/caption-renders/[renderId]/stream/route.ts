import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveCompletedCaptionRenderOutputForUser } from "@/server/caption-renders";

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
    headers,
    status,
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
      end: fileSize - 1,
      start: Math.max(fileSize - suffixLength, 0),
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
    end: Math.min(end, fileSize - 1),
    start,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; renderId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const { id, renderId } = await params;
  const renderOutput = await resolveCompletedCaptionRenderOutputForUser({
    clipId: id,
    renderId,
    userId: session.user.id,
  });

  if (!renderOutput) {
    return new NextResponse(null, { status: 404 });
  }

  const range = parseRange(request.headers.get("range"), renderOutput.fileSize);

  if (range === "invalid") {
    return new NextResponse(null, {
      headers: {
        "Content-Range": `bytes */${renderOutput.fileSize}`,
      },
      status: 416,
    });
  }

  if (range) {
    return streamFile({
      end: range.end,
      filePath: renderOutput.filePath,
      fileSize: renderOutput.fileSize,
      start: range.start,
    });
  }

  return streamFile({
    end: renderOutput.fileSize - 1,
    filePath: renderOutput.filePath,
    fileSize: renderOutput.fileSize,
    start: 0,
    status: 200,
  });
}
