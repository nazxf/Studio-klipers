-- CreateEnum
CREATE TYPE "CaptionRenderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'BURN_CAPTIONS';

-- AlterTable
ALTER TABLE "processing_jobs" ADD COLUMN "caption_render_id" TEXT;

-- CreateTable
CREATE TABLE "caption_renders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clip_id" TEXT NOT NULL,
    "subtitle_track_id" TEXT NOT NULL,
    "status" "CaptionRenderStatus" NOT NULL DEFAULT 'PENDING',
    "preset_key" "CaptionPresetKey" NOT NULL DEFAULT 'CREATOR_CLASSIC',
    "preset_style" JSONB,
    "segments_snapshot" JSONB NOT NULL,
    "output_key" TEXT,
    "size_bytes" BIGINT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caption_renders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caption_renders_user_id_status_idx" ON "caption_renders"("user_id", "status");

-- CreateIndex
CREATE INDEX "caption_renders_clip_id_status_idx" ON "caption_renders"("clip_id", "status");

-- CreateIndex
CREATE INDEX "caption_renders_subtitle_track_id_idx" ON "caption_renders"("subtitle_track_id");

-- CreateIndex
CREATE INDEX "processing_jobs_caption_render_id_idx" ON "processing_jobs"("caption_render_id");

-- AddForeignKey
ALTER TABLE "caption_renders" ADD CONSTRAINT "caption_renders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caption_renders" ADD CONSTRAINT "caption_renders_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caption_renders" ADD CONSTRAINT "caption_renders_subtitle_track_id_fkey" FOREIGN KEY ("subtitle_track_id") REFERENCES "subtitle_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_caption_render_id_fkey" FOREIGN KEY ("caption_render_id") REFERENCES "caption_renders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
