import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

type ResolvedRange = {
  end: number;
  start: number;
};

type ParsedRange = ResolvedRange | "invalid" | null;

type StreamMethod = "GET" | "HEAD";

function buildStreamResponse({
  end,
  filePath,
  fileSize,
  method,
  start,
  status = 206,
}: {
  end: number;
  filePath: string;
  fileSize: number;
  method: StreamMethod;
  start: number;
  status?: 200 | 206;
}) {
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Length": String(end - start + 1),
    "Content-Type": "video/mp4",
  });

  if (status === 206) {
    headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  }

  // HEAD must return identical headers to GET but with no body. We avoid
  // opening a read stream entirely so the disk is not touched.
  if (method === "HEAD") {
    return new Response(null, { headers, status });
  }

  const stream = Readable.toWeb(createReadStream(filePath, { start, end }));

  return new Response(stream as ReadableStream, {
    headers,
    status,
  });
}

export function parseMp4Range(
  rangeHeader: string | null,
  fileSize: number,
): ParsedRange {
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

export function createProtectedMp4StreamResponse({
  fileSize,
  filePath,
  method = "GET",
  rangeHeader,
}: {
  filePath: string;
  fileSize: number;
  method?: StreamMethod;
  rangeHeader: string | null;
}) {
  const range = parseMp4Range(rangeHeader, fileSize);

  if (range === "invalid") {
    return new Response(null, {
      headers: {
        "Content-Range": `bytes */${fileSize}`,
      },
      status: 416,
    });
  }

  if (range) {
    return buildStreamResponse({
      end: range.end,
      filePath,
      fileSize,
      method,
      start: range.start,
    });
  }

  return buildStreamResponse({
    end: fileSize - 1,
    filePath,
    fileSize,
    method,
    start: 0,
    status: 200,
  });
}
