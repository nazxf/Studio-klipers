import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  MAX_LOCAL_UPLOAD_BYTES,
  getUploadErrorMessage,
  saveLocalMp4Upload,
  UploadValidationError,
} from "@/server/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wantsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function uploadErrorResponse(request: Request, errorCode: string, status = 400) {
  if (wantsJson(request)) {
    return NextResponse.json(
      {
        error: errorCode,
        errorMessage: getUploadErrorMessage(errorCode) ?? "The upload could not be saved.",
      },
      { status },
    );
  }

  return NextResponse.redirect(new URL(`/upload?error=${errorCode}`, request.url), 303);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    if (wantsJson(request)) {
      return NextResponse.json(
        {
          error: "unauthenticated",
          errorMessage: "Sign in before uploading a local MP4.",
        },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", "/upload");

    return NextResponse.redirect(loginUrl, 303);
  }

  if (!request.body) {
    return uploadErrorResponse(request, "missing_file");
  }

  // M11: Reject non-multipart submissions before opening busboy.
  const contentType = request.headers.get("content-type");

  if (!contentType || !contentType.toLowerCase().includes("multipart/form-data")) {
    return uploadErrorResponse(request, "invalid_content_type", 415);
  }

  // M10: Pre-check Content-Length so we can reject oversized uploads at the
  // door instead of streaming the entire body before busboy hits its limit.
  const contentLengthHeader = request.headers.get("content-length");

  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_LOCAL_UPLOAD_BYTES
    ) {
      return uploadErrorResponse(request, "too_large", 413);
    }
  }

  try {
    const video = await saveLocalMp4Upload({
      source: {
        body: Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]),
        contentType,
      },
      userId: session.user.id,
    });

    if (wantsJson(request)) {
      return NextResponse.json(
        {
          id: video.id,
          redirectUrl: `/videos/${video.id}`,
        },
        { status: 201 },
      );
    }

    return NextResponse.redirect(new URL(`/videos/${video.id}`, request.url), 303);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      const status =
        error.code === "too_large"
          ? 413
          : error.code === "invalid_content_type"
            ? 415
            : 400;

      return uploadErrorResponse(request, error.code, status);
    }

    return uploadErrorResponse(request, "storage", 500);
  }
}
