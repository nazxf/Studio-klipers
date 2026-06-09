import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveCompletedClipOutputForUser } from "@/server/clip-files";
import { createProtectedMp4StreamResponse } from "@/server/protected-mp4-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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

  return createProtectedMp4StreamResponse({
    filePath: clipOutput.filePath,
    fileSize: clipOutput.fileSize,
    rangeHeader: request.headers.get("range"),
  });
}
