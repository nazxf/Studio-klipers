import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  MAX_SUBTITLE_SEGMENT_TEXT_LENGTH,
  updateSubtitleSegmentTextForUser,
} from "@/server/subtitles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; segmentId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "unauthenticated",
        errorMessage: "Sign in before editing subtitles.",
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
        errorMessage: "Send subtitle text to save.",
      },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        error: "invalid_payload",
        errorMessage: "Send subtitle text to save.",
      },
      { status: 400 },
    );
  }

  const { id, segmentId } = await params;
  const result = await updateSubtitleSegmentTextForUser({
    clipId: id,
    segmentId,
    text: (payload as { text?: unknown }).text,
    userId: session.user.id,
  });

  if (result.error === "invalid_text") {
    return NextResponse.json(
      {
        error: "invalid_text",
        errorMessage: `Subtitle text must be 1-${MAX_SUBTITLE_SEGMENT_TEXT_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  if (result.error === "not_found") {
    return NextResponse.json(
      {
        error: "not_found",
        errorMessage: "Subtitle segment was not found for this clip.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      segment: result.segment,
    },
    { status: 200 },
  );
}
