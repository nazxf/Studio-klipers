import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getCaptionRenderDownloadFileName,
  resolveCompletedCaptionRenderOutputForUser,
} from "@/server/caption-renders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

  const stream = Readable.toWeb(createReadStream(renderOutput.filePath));
  const fileName = getCaptionRenderDownloadFileName({
    renderId,
    title: renderOutput.title,
  });

  return new Response(stream as ReadableStream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(renderOutput.fileSize),
      "Content-Type": "video/mp4",
    },
    status: 200,
  });
}
