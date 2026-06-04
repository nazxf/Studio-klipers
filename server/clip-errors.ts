const DEFAULT_CLIP_PROCESSING_ERROR = "Clip processing failed. Please try again.";
const MISSING_SOURCE_ERROR = "The local source file is missing.";
const OUTPUT_CREATE_ERROR = "The output file could not be created.";

export function getRawClipProcessingErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);

  return rawMessage.replace(/\s+/g, " ").trim();
}

export function getSafeClipProcessingErrorMessage(error: unknown) {
  const message = getRawClipProcessingErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("enoent") ||
    lowerMessage.includes("no such file or directory") ||
    lowerMessage.includes("source video")
  ) {
    return MISSING_SOURCE_ERROR;
  }

  if (
    lowerMessage.includes("output clip") ||
    lowerMessage.includes("output file") ||
    lowerMessage.includes("could not be created") ||
    lowerMessage.includes("empty")
  ) {
    return OUTPUT_CREATE_ERROR;
  }

  if (
    lowerMessage.includes("ffmpeg") ||
    lowerMessage.includes("exit code") ||
    lowerMessage.includes("invalid data")
  ) {
    return DEFAULT_CLIP_PROCESSING_ERROR;
  }

  return DEFAULT_CLIP_PROCESSING_ERROR;
}
