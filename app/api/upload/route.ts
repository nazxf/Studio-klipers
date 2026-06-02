import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
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

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");

    if (!(file instanceof File)) {
      return uploadErrorResponse(request, "missing_file");
    }

    const video = await saveLocalMp4Upload({
      file,
      title: typeof title === "string" ? title : undefined,
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
      const status = error.code === "too_large" ? 413 : 400;

      return uploadErrorResponse(request, error.code, status);
    }

    return uploadErrorResponse(request, "storage", 500);
  }
}
