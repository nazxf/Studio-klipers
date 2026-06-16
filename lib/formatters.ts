/**
 * Canonical formatting utilities used across the application.
 * Import from here instead of defining local copies.
 */

/**
 * Format a byte count (number or stringified BigInt) into a human-readable
 * string like "12.4 MB". Returns `fallback` when the value is null, empty,
 * zero, or non-finite.
 */
export function formatBytes(
  sizeBytes: string | number | null | undefined,
  fallback = "0 MB",
): string {
  const size = typeof sizeBytes === "number" ? sizeBytes : Number(sizeBytes);

  if (!Number.isFinite(size) || size <= 0) {
    return fallback;
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format an ISO date string into a medium date + short time using en-US locale.
 */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Format seconds into "M:SS" or "M:SS.d" with optional decimal precision.
 * Returns `fallback` when the value is null, non-finite, or negative.
 */
export function formatSeconds(
  seconds: number | null | undefined,
  fallback = "0:00",
): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return fallback;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round((seconds % 60) * 10) / 10;
  const paddedSeconds = remainingSeconds
    .toFixed(remainingSeconds % 1 === 0 ? 0 : 1)
    .padStart(2, "0");

  return `${minutes}:${paddedSeconds}`;
}

/**
 * Format seconds into "MM:SS" with zero-padded minutes (for dashboard display).
 */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round((seconds % 60) * 10) / 10;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toFixed(remainingSeconds % 1 === 0 ? 0 : 1)
    .padStart(2, "0")}`;
}
