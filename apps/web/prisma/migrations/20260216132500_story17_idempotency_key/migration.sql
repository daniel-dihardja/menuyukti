-- AlterTable
ALTER TABLE "public"."etl_jobs"
  ADD COLUMN "file_hash" TEXT,
  ADD COLUMN "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "uq_etl_jobs_idempotency_key"
  ON "public"."etl_jobs"("idempotency_key");
