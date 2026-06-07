import path from "node:path";

export const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

export function getLocalVideoSourceKey(userId: string, videoId: string) {
  return `users/${userId}/videos/${videoId}/original.mp4`;
}

export function getLocalClipOutputKey(userId: string, clipId: string) {
  return `users/${userId}/clips/${clipId}/clip.mp4`;
}

export function getLocalCaptionRenderOutputKey({
  clipId,
  renderId,
  userId,
}: {
  clipId: string;
  renderId: string;
  userId: string;
}) {
  return `users/${userId}/clips/${clipId}/caption-renders/${renderId}/captioned.mp4`;
}

export function resolveLocalUploadKey(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/");
  const segments = normalizedKey.split("/");

  if (
    !normalizedKey ||
    normalizedKey.startsWith("/") ||
    normalizedKey.includes("\0") ||
    path.isAbsolute(normalizedKey) ||
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    segments[0] !== "users"
  ) {
    throw new Error("Invalid local storage key");
  }

  const resolvedPath = path.resolve(LOCAL_UPLOAD_ROOT, ...segments);
  const relativePath = path.relative(LOCAL_UPLOAD_ROOT, resolvedPath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Local storage key escapes upload root");
  }

  return resolvedPath;
}
