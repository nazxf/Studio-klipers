import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveCompletedClipOutputForUser } from "@/server/clip-files";
import { createProtectedMp4StreamResponse } from "@/server/protected-mp4-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleClipStreamRequest(
  request: Request,
  params: Promise<{ id: string }>,
  method: "GET" | "HEAD",
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

  return createProtectedMp4StreamResponse({
    filePath: clipOutput.filePath,
    fileSize: clipOutput.fileSize,
    method,
    rangeHeader: request.headers.get("range"),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleClipStreamRequest(request, params, "GET");
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleClipStreamRequest(request, params, "HEAD");
}
