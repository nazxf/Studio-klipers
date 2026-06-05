-- CreateEnum
CREATE TYPE "CaptionPresetKey" AS ENUM ('CREATOR_CLASSIC', 'LIME_PUNCH', 'GAMING_BOLD', 'CLEAN_LOWER', 'CINEMATIC_POP');

-- AlterTable
ALTER TABLE "subtitle_tracks" ADD COLUMN     "preset_key" "CaptionPresetKey" NOT NULL DEFAULT 'CREATOR_CLASSIC',
ADD COLUMN     "preset_style" JSONB;
