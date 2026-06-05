import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createPendingSubtitleGenerationJob,
  getSubtitleJobValidationMessage,
  SubtitleJobValidationError,
} from "@/server/subtitle-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "unauthenticated",
        errorMessage: "Sign in before generating subtitles.",
      },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const result = await createPendingSubtitleGenerationJob({
      clipId: id,
      userId: session.user.id,
    });

    return NextResponse.json(result, {
      status: result.reusedJob ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof SubtitleJobValidationError) {
      const status =
        error.code === "clip_not_found"
          ? 404
          : error.code === "subtitles_already_ready"
            ? 409
            : 400;

      return NextResponse.json(
        {
          error: error.code,
          errorMessage: getSubtitleJobValidationMessage(error.code),
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: "subtitle_job",
        errorMessage: "The subtitle job could not be created. Try again.",
      },
      { status: 500 },
    );
  }
}
