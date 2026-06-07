-- CreateIndex
CREATE INDEX "processing_jobs_type_status_created_at_idx" ON "processing_jobs"("type", "status", "created_at");
