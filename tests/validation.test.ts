import { describe, expect, it } from "vitest";

import {
  clipCreateSchema,
  getFirstIssueCode,
  MIN_CLIP_DURATION_SECONDS,
  MAX_CLIP_DURATION_SECONDS,
  MAX_CLIP_TITLE_LENGTH,
} from "@/lib/validation";

describe("clipCreateSchema", () => {
  // ── Happy path ──────────────────────────────────────────────────────

  it("accepts valid numeric start/end", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startSeconds).toBe(0);
      expect(result.data.endSeconds).toBe(10);
      expect(result.data.title).toBeUndefined();
    }
  });

  it("accepts string numbers for start/end", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: "5",
      endSeconds: "20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startSeconds).toBe(5);
      expect(result.data.endSeconds).toBe(20);
    }
  });

  it("accepts a valid title", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 10,
      title: "My Clip",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Clip");
    }
  });

  it("trims and collapses whitespace in title", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 10,
      title: "  hello   world  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("hello world");
    }
  });

  it("truncates title to MAX_CLIP_TITLE_LENGTH", () => {
    const longTitle = "A".repeat(200);
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 10,
      title: longTitle,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title!.length).toBe(MAX_CLIP_TITLE_LENGTH);
    }
  });

  it("treats empty/whitespace-only title as undefined", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 10,
      title: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBeUndefined();
    }
  });

  it("treats null title as undefined", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 10,
      title: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBeUndefined();
    }
  });

  it("rounds seconds to millisecond precision", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 1.23456,
      endSeconds: 10.98765,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startSeconds).toBe(1.235);
      expect(result.data.endSeconds).toBe(10.988);
    }
  });

  // ── Minimum / maximum duration boundaries ───────────────────────────

  it("accepts exactly MIN_CLIP_DURATION_SECONDS", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: MIN_CLIP_DURATION_SECONDS,
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly MAX_CLIP_DURATION_SECONDS", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: MAX_CLIP_DURATION_SECONDS,
    });
    expect(result.success).toBe(true);
  });

  // ── Rejection cases ─────────────────────────────────────────────────

  it("rejects end <= start (end_before_start)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 10,
      endSeconds: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("end_before_start");
    }
  });

  it("rejects equal start and end (end_before_start)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 10,
      endSeconds: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("end_before_start");
    }
  });

  it("rejects duration shorter than MIN_CLIP_DURATION_SECONDS (too_short)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("too_short");
    }
  });

  it("rejects duration longer than MAX_CLIP_DURATION_SECONDS (too_long)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: MAX_CLIP_DURATION_SECONDS + 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("too_long");
    }
  });

  it("rejects negative start (invalid_start)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: -1,
      endSeconds: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("invalid_start");
    }
  });

  it("rejects NaN start (invalid_start)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: NaN,
      endSeconds: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("invalid_start");
    }
  });

  it("rejects Infinity end (invalid_end)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: Infinity,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("invalid_end");
    }
  });

  it("rejects empty string start (invalid_start)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: "",
      endSeconds: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("invalid_start");
    }
  });

  it("rejects non-numeric string end (invalid_end)", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: 0,
      endSeconds: "abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("invalid_end");
    }
  });
});

describe("getFirstIssueCode", () => {
  it("returns the first issue message", () => {
    const result = clipCreateSchema.safeParse({
      startSeconds: -1,
      endSeconds: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFirstIssueCode(result.error)).toBe("invalid_start");
    }
  });

  it("returns invalid_payload for empty issues array", () => {
    const { ZodError } = require("zod");
    const emptyError = new ZodError([]);
    expect(getFirstIssueCode(emptyError)).toBe("invalid_payload");
  });
});
