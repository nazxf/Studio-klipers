import { describe, expect, it } from "vitest";

import {
  ClipValidationError,
  getClipValidationMessage,
} from "@/server/clip-jobs";

describe("ClipValidationError", () => {
  it("is an instance of Error", () => {
    const err = new ClipValidationError("video_not_found");
    expect(err).toBeInstanceOf(Error);
  });

  it("stores the code", () => {
    const err = new ClipValidationError("source_missing");
    expect(err.code).toBe("source_missing");
  });

  it("uses the code as the message", () => {
    const err = new ClipValidationError("too_short");
    expect(err.message).toBe("too_short");
  });
});

describe("getClipValidationMessage", () => {
  const knownCodes = [
    "invalid_payload",
    "invalid_start",
    "invalid_end",
    "end_before_start",
    "too_short",
    "too_long",
    "duration_missing",
    "beyond_duration",
    "video_not_found",
    "source_missing",
  ] as const;

  it.each(knownCodes)(
    "returns a non-empty string for known code '%s'",
    (code) => {
      const message = getClipValidationMessage(code);
      expect(typeof message).toBe("string");
      expect(message!.length).toBeGreaterThan(0);
    },
  );

  it("returns null for unknown code", () => {
    expect(getClipValidationMessage("unknown_code")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getClipValidationMessage(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getClipValidationMessage("")).toBeNull();
  });

  // Spot-check specific messages
  it("returns correct message for too_short", () => {
    expect(getClipValidationMessage("too_short")).toBe(
      "Clip duration must be at least 3 seconds.",
    );
  });

  it("returns correct message for too_long", () => {
    expect(getClipValidationMessage("too_long")).toBe(
      "Clip duration must be 5 minutes or shorter.",
    );
  });

  it("returns correct message for end_before_start", () => {
    expect(getClipValidationMessage("end_before_start")).toBe(
      "End time must be greater than start time.",
    );
  });

  it("returns correct message for video_not_found", () => {
    expect(getClipValidationMessage("video_not_found")).toBe(
      "The source video was not found for this workspace.",
    );
  });

  it("returns correct message for beyond_duration", () => {
    expect(getClipValidationMessage("beyond_duration")).toBe(
      "End time cannot be greater than the source video duration.",
    );
  });
});
