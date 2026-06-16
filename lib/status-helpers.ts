/**
 * Canonical badge variant helpers for video and clip statuses.
 */

export function getVideoStatusVariant(status: string) {
  if (status === "READY") {
    return "success";
  }

  if (status === "FAILED") {
    return "error";
  }

  return "secondary";
}

export function getClipStatusVariant(status: string) {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "PROCESSING") {
    return "default";
  }

  if (status === "FAILED") {
    return "error";
  }

  return "warning";
}
