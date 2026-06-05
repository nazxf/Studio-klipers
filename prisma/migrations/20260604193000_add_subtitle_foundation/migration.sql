-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'GENERATE_SUBTITLES';

-- CreateEnum
CREATE TYPE "SubtitleTrackStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "SubtitleSource" AS ENUM ('AUTO');

-- CreateTable
CREATE TABLE "subtitle_tracks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clip_id" TEXT NOT NULL,
    "status" "SubtitleTrackStatus" NOT NULL DEFAULT 'PENDING',
    "source" "SubtitleSource" NOT NULL DEFAULT 'AUTO',
    "language_code" TEXT,
    "language_probability" DOUBLE PRECISION,
    "engine" TEXT,
    "model_name" TEXT,
    "error_message" TEXT,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtitle_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtitle_segments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "start_seconds" DOUBLE PRECISION NOT NULL,
    "end_seconds" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "generated_text" TEXT,
    "confidence" DOUBLE PRECISION,
    "words" JSONB,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtitle_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subtitle_tracks_clip_id_key" ON "subtitle_tracks"("clip_id");

-- CreateIndex
CREATE INDEX "subtitle_tracks_user_id_status_idx" ON "subtitle_tracks"("user_id", "status");

-- CreateIndex
CREATE INDEX "subtitle_tracks_status_idx" ON "subtitle_tracks"("status");

-- CreateIndex
CREATE INDEX "subtitle_segments_user_id_idx" ON "subtitle_segments"("user_id");

-- CreateIndex
CREATE INDEX "subtitle_segments_track_id_sort_order_idx" ON "subtitle_segments"("track_id", "sort_order");

-- CreateIndex
CREATE INDEX "subtitle_segments_track_id_start_seconds_idx" ON "subtitle_segments"("track_id", "start_seconds");

-- AddForeignKey
ALTER TABLE "subtitle_tracks" ADD CONSTRAINT "subtitle_tracks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle_tracks" ADD CONSTRAINT "subtitle_tracks_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle_segments" ADD CONSTRAINT "subtitle_segments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitle_segments" ADD CONSTRAINT "subtitle_segments_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "subtitle_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
