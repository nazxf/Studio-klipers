import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { clipCreateSchema, getFirstIssueCode } from "@/lib/validation";
import {
  ClipValidationError,
  createPendingClipJob,
  getClipValidationMessage,
} from "@/server/clip-jobs";
import { JsonBodyError, readBoundedJsonBody } from "@/server/request-json";

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
    payload = await readBoundedJsonBody(request);
  } catch (error) {
    if (error instanceof JsonBodyError && error.code === "payload_too_large") {
      return NextResponse.json(
        {
          error: "payload_too_large",
          errorMessage: "Clip request body is too large.",
        },
        { status: 413 },
      );
    }

    return NextResponse.json(
      {
        error: "invalid_payload",
        errorMessage: getClipValidationMessage("invalid_payload"),
      },
      { status: 400 },
    );
  }

  const parsed = clipCreateSchema.safeParse(payload);

  if (!parsed.success) {
    const code = getFirstIssueCode(parsed.error);

    return NextResponse.json(
      {
        error: code,
        errorMessage:
          getClipValidationMessage(code) ??
          getClipValidationMessage("invalid_payload"),
      },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    const result = await createPendingClipJob({
      endSeconds: parsed.data.endSeconds,
      startSeconds: parsed.data.startSeconds,
      title: parsed.data.title,
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
