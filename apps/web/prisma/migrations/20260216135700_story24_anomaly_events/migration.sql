-- CreateTable
CREATE TABLE "public"."anomaly_events" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "analytics_id" INTEGER,
    "pipeline_run_id" UUID,
    "anomaly_type" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "previous_value" DECIMAL(18,6),
    "current_value" DECIMAL(18,6),
    "delta_value" DECIMAL(18,6),
    "severity" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_anomaly_event_branch_created_at"
ON "public"."anomaly_events"("branch_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_anomaly_event_pipeline_run_id"
ON "public"."anomaly_events"("pipeline_run_id");

-- AddForeignKey
ALTER TABLE "public"."anomaly_events"
ADD CONSTRAINT "anomaly_events_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anomaly_events"
ADD CONSTRAINT "anomaly_events_analytics_id_fkey"
FOREIGN KEY ("analytics_id") REFERENCES "public"."analytics"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
