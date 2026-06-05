import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isCaptionPresetKey } from "@/lib/caption-presets";
import { updateSubtitleTrackPresetForUser } from "@/server/subtitles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "unauthenticated",
        errorMessage: "Sign in before changing caption presets.",
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
        errorMessage: "Send a caption preset key to save.",
      },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        error: "invalid_payload",
        errorMessage: "Send a caption preset key to save.",
      },
      { status: 400 },
    );
  }

  const presetKey = (payload as { presetKey?: unknown }).presetKey;

  if (!isCaptionPresetKey(presetKey)) {
    return NextResponse.json(
      {
        error: "invalid_preset",
        errorMessage: "Choose a supported caption preset.",
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateSubtitleTrackPresetForUser({
    clipId: id,
    presetKey,
    userId: session.user.id,
  });

  if (result.error === "invalid_preset") {
    return NextResponse.json(
      {
        error: "invalid_preset",
        errorMessage: "Choose a supported caption preset.",
      },
      { status: 400 },
    );
  }

  if (result.error === "not_found") {
    return NextResponse.json(
      {
        error: "not_found",
        errorMessage: "Subtitle track was not found for this clip.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      track: result.track,
    },
    { status: 200 },
  );
}
