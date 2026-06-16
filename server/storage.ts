import path from "node:path";

const UPLOAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getLocalUploadRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), "uploads");
}

export function getLocalUploadTempRoot() {
  return path.resolve(getLocalUploadRoot(), "tmp", "uploads");
}

export function getLocalUploadTempPath(uploadId: string) {
  if (typeof uploadId !== "string" || !UPLOAD_ID_PATTERN.test(uploadId)) {
    throw new Error("Invalid upload id");
  }

  const tempRoot = getLocalUploadTempRoot();
  const resolvedPath = path.resolve(tempRoot, `${uploadId}.part`);
  const relativePath = path.relative(tempRoot, resolvedPath);

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Temp upload path escapes temp upload root");
  }

  return resolvedPath;
}

export function getLocalVideoSourceKey(userId: string, videoId: string) {
  return `users/${userId}/videos/${videoId}/original.mp4`;
}

export function getLocalClipOutputKey(userId: string, clipId: string) {
  return `users/${userId}/clips/${clipId}/clip.mp4`;
}

export function resolveLocalUploadKey(storageKey: string) {
  const uploadRoot = getLocalUploadRoot();
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

  const resolvedPath = path.resolve(uploadRoot, ...segments);
  const relativePath = path.relative(uploadRoot, resolvedPath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Local storage key escapes upload root");
  }

  return resolvedPath;
}
