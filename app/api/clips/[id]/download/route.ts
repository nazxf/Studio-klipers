import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getClipDownloadDisposition,
  resolveCompletedClipOutputForUser,
} from "@/server/clip-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  const clipOutput = await resolveCompletedClipOutputForUser({
    clipId: id,
    userId: session.user.id,
  });

  if (!clipOutput) {
    return new NextResponse(null, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(clipOutput.filePath));
  const { headerValue } = getClipDownloadDisposition({
    clipId: id,
    title: clipOutput.title,
  });

  return new Response(stream as ReadableStream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": headerValue,
      "Content-Length": String(clipOutput.fileSize),
      "Content-Type": "video/mp4",
    },
    status: 200,
  });
}
