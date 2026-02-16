-- CreateTable
CREATE TABLE "etl_jobs" (
    "id" TEXT NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "analytics_id" INTEGER,
    "source_file" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "pipeline_run_id" UUID,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etl_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_etl_jobs_branch_status" ON "etl_jobs"("branch_id", "status");

-- CreateIndex
CREATE INDEX "ix_etl_jobs_analytics_id" ON "etl_jobs"("analytics_id");

-- AddForeignKey
ALTER TABLE "etl_jobs" ADD CONSTRAINT "etl_jobs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etl_jobs" ADD CONSTRAINT "etl_jobs_analytics_id_fkey" FOREIGN KEY ("analytics_id") REFERENCES "analytics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
