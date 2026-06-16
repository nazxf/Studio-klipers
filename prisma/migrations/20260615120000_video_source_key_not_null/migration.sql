-- Make Video.source_key NOT NULL.
-- Any video row without a source_key is unusable (cannot stream, cannot clip),
-- so we delete those orphan rows before tightening the constraint.

DELETE FROM "videos" WHERE "source_key" IS NULL;

ALTER TABLE "videos"
  ALTER COLUMN "source_key" SET NOT NULL;
