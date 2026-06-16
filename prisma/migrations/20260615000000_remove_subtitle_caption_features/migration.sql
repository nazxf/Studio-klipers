-- Remove forbidden MVP features: auto-subtitles and caption rendering.
-- Drops dependent tables, processing-jobs FK, and unused enum values.

-- 1. Delete processing jobs that reference the forbidden job types.
DELETE FROM "processing_jobs"
WHERE "type" IN ('GENERATE_SUBTITLES', 'BURN_CAPTIONS');

-- 2. Drop dependent tables (order matters: caption_renders depends on subtitle_tracks).
DROP TABLE IF EXISTS "caption_renders" CASCADE;
DROP TABLE IF EXISTS "subtitle_segments" CASCADE;
DROP TABLE IF EXISTS "subtitle_tracks" CASCADE;

-- 3. Drop the caption_render_id column and its index from processing_jobs.
DROP INDEX IF EXISTS "processing_jobs_caption_render_id_idx";
ALTER TABLE "processing_jobs" DROP COLUMN IF EXISTS "caption_render_id";

-- 4. Recreate JobType enum without the forbidden values.
ALTER TYPE "JobType" RENAME TO "JobType_old";
CREATE TYPE "JobType" AS ENUM ('CREATE_CLIP');
ALTER TABLE "processing_jobs"
  ALTER COLUMN "type" TYPE "JobType"
  USING ("type"::text::"JobType");
DROP TYPE "JobType_old";

-- 5. Drop unused subtitle/caption enum types.
DROP TYPE IF EXISTS "SubtitleTrackStatus";
DROP TYPE IF EXISTS "SubtitleSource";
DROP TYPE IF EXISTS "CaptionRenderStatus";
DROP TYPE IF EXISTS "CaptionPresetKey";
