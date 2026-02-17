CREATE TABLE "public"."etl_pipeline_runs" (
    "id" TEXT NOT NULL,
    "etl_job_id" TEXT NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "analytics_id" INTEGER,
    "pipeline_run_id" UUID,
    "trigger" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "input_ref" JSONB,
    "output_ref" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etl_pipeline_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."etl_pipeline_stage_executions" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "trigger" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actor" TEXT,
    "input_ref" JSONB,
    "output_ref" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etl_pipeline_stage_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_etl_pipeline_runs_etl_job_id"
ON "public"."etl_pipeline_runs"("etl_job_id");

CREATE INDEX "ix_etl_pipeline_runs_branch_created_at"
ON "public"."etl_pipeline_runs"("branch_id", "created_at");

CREATE INDEX "ix_etl_pipeline_runs_status_created_at"
ON "public"."etl_pipeline_runs"("status", "created_at");

CREATE INDEX "ix_etl_pipeline_runs_pipeline_run_id"
ON "public"."etl_pipeline_runs"("pipeline_run_id");

CREATE UNIQUE INDEX "uq_etl_pipeline_stage_run_stage_attempt"
ON "public"."etl_pipeline_stage_executions"("run_id", "stage", "attempt");

CREATE INDEX "ix_etl_pipeline_stage_branch_created_at"
ON "public"."etl_pipeline_stage_executions"("branch_id", "created_at");

CREATE INDEX "ix_etl_pipeline_stage_status_created_at"
ON "public"."etl_pipeline_stage_executions"("status", "created_at");

CREATE INDEX "ix_etl_pipeline_stage_run_stage_status"
ON "public"."etl_pipeline_stage_executions"("run_id", "stage", "status");

ALTER TABLE "public"."etl_pipeline_runs"
ADD CONSTRAINT "etl_pipeline_runs_etl_job_id_fkey"
FOREIGN KEY ("etl_job_id") REFERENCES "public"."etl_jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."etl_pipeline_runs"
ADD CONSTRAINT "etl_pipeline_runs_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."etl_pipeline_runs"
ADD CONSTRAINT "etl_pipeline_runs_analytics_id_fkey"
FOREIGN KEY ("analytics_id") REFERENCES "public"."analytics"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."etl_pipeline_stage_executions"
ADD CONSTRAINT "etl_pipeline_stage_executions_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "public"."etl_pipeline_runs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."etl_pipeline_stage_executions"
ADD CONSTRAINT "etl_pipeline_stage_executions_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
