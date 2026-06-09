import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveCompletedCaptionRenderOutputForUser } from "@/server/caption-renders";
import { createProtectedMp4StreamResponse } from "@/server/protected-mp4-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  return createProtectedMp4StreamResponse({
    filePath: renderOutput.filePath,
    fileSize: renderOutput.fileSize,
    rangeHeader: request.headers.get("range"),
  });
}
