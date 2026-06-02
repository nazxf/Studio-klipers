import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  ClipValidationError,
  createPendingClipJob,
  getClipValidationMessage,
} from "@/server/clip-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "unauthenticated",
        errorMessage: "Sign in before creating a clip.",
      },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "invalid_payload",
        errorMessage: getClipValidationMessage("invalid_payload"),
      },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        error: "invalid_payload",
        errorMessage: getClipValidationMessage("invalid_payload"),
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const data = payload as {
    endSeconds?: unknown;
    startSeconds?: unknown;
    title?: unknown;
  };

  try {
    const result = await createPendingClipJob({
      endSeconds: data.endSeconds,
      startSeconds: data.startSeconds,
      title: data.title,
      userId: session.user.id,
      videoId: id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ClipValidationError) {
      const status = error.code === "video_not_found" ? 404 : 400;

      return NextResponse.json(
        {
          error: error.code,
          errorMessage: getClipValidationMessage(error.code),
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: "storage",
        errorMessage: "The clip job could not be created. Try again.",
      },
      { status: 500 },
    );
  }
}
