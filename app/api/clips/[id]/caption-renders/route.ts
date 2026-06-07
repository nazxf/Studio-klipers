import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  CaptionRenderJobValidationError,
  createPendingCaptionRenderJob,
  getCaptionRenderJobValidationMessage,
} from "@/server/caption-render-jobs";

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
        errorMessage: "Sign in before creating captioned renders.",
      },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const result = await createPendingCaptionRenderJob({
      clipId: id,
      userId: session.user.id,
    });

    return NextResponse.json(result, {
      status: result.reusedJob ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof CaptionRenderJobValidationError) {
      const status =
        error.code === "clip_not_found"
          ? 404
          : error.code === "no_subtitle_segments"
            ? 409
            : 400;

      return NextResponse.json(
        {
          error: error.code,
          errorMessage: getCaptionRenderJobValidationMessage(error.code),
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: "caption_render_job",
        errorMessage: "The captioned render job could not be created. Try again.",
      },
      { status: 500 },
    );
  }
}
