import { stat } from "node:fs/promises";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProtectedMp4StreamResponse } from "@/server/protected-mp4-stream";
import { getLocalVideoSourceKey, resolveLocalUploadKey } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleVideoStreamRequest(
  request: Request,
  params: Promise<{ id: string }>,
  method: "GET" | "HEAD",
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

  if (video.sourceKey !== getLocalVideoSourceKey(session.user.id, id)) {
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

  return createProtectedMp4StreamResponse({
    filePath,
    fileSize,
    method,
    rangeHeader: request.headers.get("range"),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleVideoStreamRequest(request, params, "GET");
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleVideoStreamRequest(request, params, "HEAD");
}
