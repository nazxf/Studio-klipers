import { z } from "zod";

export const MIN_CLIP_DURATION_SECONDS = 3;
export const MAX_CLIP_DURATION_SECONDS = 300;
export const MAX_CLIP_TITLE_LENGTH = 120;

/**
 * Coerce a numeric value provided as either a number or numeric string into a
 * finite number rounded to milliseconds. Returns null when the value cannot be
 * coerced; the schema below rejects null with a custom error.
 */
function coerceSeconds(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "") {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? Math.round(parsed * 1000) / 1000 : null;
  }

  return null;
}

const startSecondsSchema = z
  .preprocess(coerceSeconds, z.number({ message: "invalid_start" }))
  .refine((value) => value >= 0, { message: "invalid_start" });

const endSecondsSchema = z.preprocess(
  coerceSeconds,
  z.number({ message: "invalid_end" }),
);

const optionalTitleSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const cleaned = value.replace(/\s+/g, " ").trim();

    return cleaned ? cleaned.slice(0, MAX_CLIP_TITLE_LENGTH) : undefined;
  });

export const clipCreateSchema = z
  .object({
    endSeconds: endSecondsSchema,
    startSeconds: startSecondsSchema,
    title: optionalTitleSchema,
  })
  .superRefine((data, ctx) => {
    if (data.endSeconds <= data.startSeconds) {
      ctx.addIssue({
        code: "custom",
        message: "end_before_start",
        path: ["endSeconds"],
      });
      return;
    }

    const duration =
      Math.round((data.endSeconds - data.startSeconds) * 1000) / 1000;

    if (duration < MIN_CLIP_DURATION_SECONDS) {
      ctx.addIssue({
        code: "custom",
        message: "too_short",
        path: ["endSeconds"],
      });
      return;
    }

    if (duration > MAX_CLIP_DURATION_SECONDS) {
      ctx.addIssue({
        code: "custom",
        message: "too_long",
        path: ["endSeconds"],
      });
    }
  });

export type ClipCreateInput = z.infer<typeof clipCreateSchema>;

/**
 * Extract the first issue's message as a stable error code for the route to
 * return to the client. The schema deliberately uses error-code strings as
 * messages so the API contract is uniform.
 */
export function getFirstIssueCode(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "invalid_payload";
}
