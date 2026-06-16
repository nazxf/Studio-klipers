import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getLocalUploadRoot,
  getLocalUploadTempRoot,
  getLocalUploadTempPath,
  getLocalVideoSourceKey,
  getLocalClipOutputKey,
  resolveLocalUploadKey,
} from "@/server/storage";

describe("getLocalUploadRoot", () => {
  it("returns an absolute path ending with uploads", () => {
    const root = getLocalUploadRoot();
    expect(path.isAbsolute(root)).toBe(true);
    expect(root.endsWith("uploads")).toBe(true);
  });
});

describe("getLocalUploadTempRoot", () => {
  it("returns a path under uploads/tmp/uploads", () => {
    const tempRoot = getLocalUploadTempRoot();
    const root = getLocalUploadRoot();
    expect(tempRoot.startsWith(root)).toBe(true);
    expect(tempRoot).toContain("tmp");
  });
});

describe("getLocalUploadTempPath", () => {
  const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("returns a .part file for a valid UUID", () => {
    const result = getLocalUploadTempPath(validUuid);
    expect(result.endsWith(`${validUuid}.part`)).toBe(true);
    expect(path.isAbsolute(result)).toBe(true);
  });

  it("throws for non-UUID string", () => {
    expect(() => getLocalUploadTempPath("not-a-uuid")).toThrow(
      "Invalid upload id",
    );
  });

  it("throws for empty string", () => {
    expect(() => getLocalUploadTempPath("")).toThrow("Invalid upload id");
  });

  it("throws for path traversal attempt in UUID slot", () => {
    expect(() => getLocalUploadTempPath("../../../etc/passwd")).toThrow(
      "Invalid upload id",
    );
  });
});

describe("getLocalVideoSourceKey", () => {
  it("returns the correct relative key", () => {
    const key = getLocalVideoSourceKey("user-123", "video-456");
    expect(key).toBe("users/user-123/videos/video-456/original.mp4");
  });
});

describe("getLocalClipOutputKey", () => {
  it("returns the correct relative key", () => {
    const key = getLocalClipOutputKey("user-123", "clip-789");
    expect(key).toBe("users/user-123/clips/clip-789/clip.mp4");
  });
});

describe("resolveLocalUploadKey", () => {
  it("resolves a valid key to an absolute path under uploads", () => {
    const key = "users/user-123/videos/video-456/original.mp4";
    const resolved = resolveLocalUploadKey(key);
    const root = getLocalUploadRoot();
    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved.startsWith(root)).toBe(true);
  });

  it("rejects empty key", () => {
    expect(() => resolveLocalUploadKey("")).toThrow("Invalid local storage key");
  });

  it("rejects absolute path", () => {
    expect(() => resolveLocalUploadKey("/etc/passwd")).toThrow(
      "Invalid local storage key",
    );
  });

  it("rejects path with .. traversal", () => {
    expect(() =>
      resolveLocalUploadKey("users/../../../etc/passwd"),
    ).toThrow("Invalid local storage key");
  });

  it("rejects key not starting with users/", () => {
    expect(() => resolveLocalUploadKey("other/path/file.mp4")).toThrow(
      "Invalid local storage key",
    );
  });

  it("rejects key with null bytes", () => {
    expect(() =>
      resolveLocalUploadKey("users/foo\0bar/videos/v1/original.mp4"),
    ).toThrow("Invalid local storage key");
  });

  it("rejects key starting with /", () => {
    expect(() =>
      resolveLocalUploadKey("/users/foo/videos/v1/original.mp4"),
    ).toThrow("Invalid local storage key");
  });

  it("rejects key with empty segments", () => {
    expect(() =>
      resolveLocalUploadKey("users//foo/videos/v1/original.mp4"),
    ).toThrow("Invalid local storage key");
  });

  it("rejects key with . segment", () => {
    expect(() =>
      resolveLocalUploadKey("users/./foo/videos/v1/original.mp4"),
    ).toThrow("Invalid local storage key");
  });

  it("normalizes backslashes and still validates", () => {
    const key = "users\\user-1\\videos\\v1\\original.mp4";
    const resolved = resolveLocalUploadKey(key);
    const root = getLocalUploadRoot();
    expect(resolved.startsWith(root)).toBe(true);
  });
});
