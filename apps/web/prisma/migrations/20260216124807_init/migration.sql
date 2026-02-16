-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "staging";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "warehouse";

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'IDR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_file" TEXT,
    "period_start" DATE,
    "period_end" DATE,
    "totalOrders" INTEGER,
    "totalItemsSold" INTEGER,
    "totalRevenue" DECIMAL(12,2),
    "totalCogs" DECIMAL(12,2),
    "totalProfit" DECIMAL(12,2),
    "totalMargin" DECIMAL(6,4),
    "avgOrderRevenue" DECIMAL(12,2),
    "avgOrderItems" DECIMAL(10,2),
    "avgPopularity" DECIMAL(10,6),
    "maxOrderItems" INTEGER,
    "minOrderItems" INTEGER,
    "maxOrderRevenue" DECIMAL(12,2),
    "minOrderRevenue" DECIMAL(12,2),
    "matrix_json" JSONB,
    "matrix_distribution_json" JSONB,
    "heatmap_json" JSONB,
    "popularity_json" JSONB,
    "insights_json" JSONB,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_outputs" (
    "id" SERIAL NOT NULL,
    "agent_id" TEXT NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "analytics_id" INTEGER NOT NULL,
    "outputs" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_costs" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_menu_items" (
    "id" SERIAL NOT NULL,
    "analytics_id" INTEGER NOT NULL,
    "menu_name" TEXT NOT NULL,
    "menu_category" TEXT,
    "menu_category_detail" TEXT,
    "quantity" INTEGER NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "cogs" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staging"."stg_pos_raw" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_file" TEXT,
    "row_hash" TEXT NOT NULL,
    "row_data" JSONB NOT NULL,
    "ingested_at_utc" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stg_pos_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staging"."stg_pos_rejected" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_file" TEXT,
    "row_hash" TEXT NOT NULL,
    "row_data" JSONB NOT NULL,
    "rejection_reason" TEXT NOT NULL,
    "ingested_at_utc" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stg_pos_rejected_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staging"."stg_pos_clean" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_file" TEXT,
    "row_hash" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "menu" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "total_after_bill_discount" DECIMAL(14,4) NOT NULL,
    "order_time" TIMESTAMPTZ(6) NOT NULL,
    "menu_category" TEXT NOT NULL,
    "menu_category_detail" TEXT NOT NULL,
    "ingested_at_utc" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stg_pos_clean_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."dim_pipeline_run" (
    "pipeline_run_id" UUID NOT NULL,
    "schema_version" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_file" TEXT,
    "ingested_at_utc" TIMESTAMPTZ(6) NOT NULL,
    "quality_status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_pipeline_run_pkey" PRIMARY KEY ("pipeline_run_id")
);

-- CreateTable
CREATE TABLE "warehouse"."dim_date" (
    "date_key" INTEGER NOT NULL,
    "full_date" DATE NOT NULL,
    "day_of_month" INTEGER NOT NULL,
    "month_of_year" INTEGER NOT NULL,
    "year_number" INTEGER NOT NULL,
    "weekday_iso" INTEGER NOT NULL,
    "is_weekend" BOOLEAN NOT NULL,

    CONSTRAINT "dim_date_pkey" PRIMARY KEY ("date_key")
);

-- CreateTable
CREATE TABLE "warehouse"."dim_location" (
    "location_key" BIGSERIAL NOT NULL,
    "operational_location_id" INTEGER NOT NULL,
    "location_name" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_location_pkey" PRIMARY KEY ("location_key")
);

-- CreateTable
CREATE TABLE "warehouse"."dim_pos_source" (
    "pos_source_key" BIGSERIAL NOT NULL,
    "source_system" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_pos_source_pkey" PRIMARY KEY ("pos_source_key")
);

-- CreateTable
CREATE TABLE "warehouse"."dim_menu_item" (
    "menu_item_key" BIGSERIAL NOT NULL,
    "location_key" BIGINT NOT NULL,
    "menu_name" TEXT NOT NULL,
    "menu_name_norm" TEXT NOT NULL,
    "menu_category" TEXT,
    "menu_category_detail" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_menu_item_pkey" PRIMARY KEY ("menu_item_key")
);

-- CreateTable
CREATE TABLE "warehouse"."fact_order_item" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "date_key" INTEGER NOT NULL,
    "location_key" BIGINT NOT NULL,
    "menu_item_key" BIGINT NOT NULL,
    "pos_source_key" BIGINT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "line_number" INTEGER,
    "qty" DECIMAL(12,3) NOT NULL,
    "gross_revenue" DECIMAL(14,4) NOT NULL,
    "net_revenue" DECIMAL(14,4) NOT NULL,
    "discount" DECIMAL(14,4) NOT NULL,
    "cogs" DECIMAL(14,4),
    "margin" DECIMAL(14,4),
    "order_time" TIMESTAMPTZ(6) NOT NULL,
    "row_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."fact_menu_hourly" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "date_key" INTEGER NOT NULL,
    "location_key" BIGINT NOT NULL,
    "menu_item_key" BIGINT NOT NULL,
    "hour_of_day" INTEGER NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "net_revenue" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_menu_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."fact_menu_daily" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "date_key" INTEGER NOT NULL,
    "location_key" BIGINT NOT NULL,
    "menu_item_key" BIGINT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "net_revenue" DECIMAL(14,4) NOT NULL,
    "cogs" DECIMAL(14,4),
    "margin" DECIMAL(14,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_menu_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."pipeline_reconciliation_report" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "location_key" BIGINT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "legacy_value" DECIMAL(18,6) NOT NULL,
    "warehouse_value" DECIMAL(18,6) NOT NULL,
    "delta" DECIMAL(18,6) NOT NULL,
    "within_threshold" BOOLEAN NOT NULL,
    "threshold_value" DECIMAL(18,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_reconciliation_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse"."pipeline_run_metrics" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "input_rows" INTEGER NOT NULL,
    "valid_rows" INTEGER NOT NULL,
    "rejected_rows" INTEGER NOT NULL,
    "reject_rate" DECIMAL(10,6) NOT NULL,
    "load_duration_ms" INTEGER NOT NULL,
    "quality_gate_passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_run_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_slug_key" ON "branches"("slug");

-- CreateIndex
CREATE INDEX "ix_analytics_branch_id" ON "analytics"("branch_id");

-- CreateIndex
CREATE INDEX "ix_agent_output_lookup" ON "agent_outputs"("branch_id", "analytics_id", "agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_agent_output_key" ON "agent_outputs"("agent_id", "branch_id", "analytics_id");

-- CreateIndex
CREATE INDEX "ix_fixed_costs_branch_id" ON "fixed_costs"("branch_id");

-- CreateIndex
CREATE INDEX "ix_menu_items_analytics_id" ON "analytics_menu_items"("analytics_id");

-- CreateIndex
CREATE INDEX "ix_menu_items_menu_category" ON "analytics_menu_items"("menu_category");

-- CreateIndex
CREATE UNIQUE INDEX "uq_menu_item_per_analytics" ON "analytics_menu_items"("analytics_id", "menu_name");

-- CreateIndex
CREATE INDEX "ix_stg_pos_raw_pipeline_run_id" ON "staging"."stg_pos_raw"("pipeline_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "stg_pos_raw_pipeline_run_id_row_hash_key" ON "staging"."stg_pos_raw"("pipeline_run_id", "row_hash");

-- CreateIndex
CREATE INDEX "ix_stg_pos_rejected_pipeline_run_id" ON "staging"."stg_pos_rejected"("pipeline_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "stg_pos_rejected_pipeline_run_id_row_hash_key" ON "staging"."stg_pos_rejected"("pipeline_run_id", "row_hash");

-- CreateIndex
CREATE INDEX "ix_stg_pos_clean_pipeline_run_id" ON "staging"."stg_pos_clean"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "ix_stg_pos_clean_order_time" ON "staging"."stg_pos_clean"("order_time");

-- CreateIndex
CREATE UNIQUE INDEX "stg_pos_clean_pipeline_run_id_row_hash_key" ON "staging"."stg_pos_clean"("pipeline_run_id", "row_hash");

-- CreateIndex
CREATE INDEX "ix_dim_pipeline_run_ingested_at" ON "warehouse"."dim_pipeline_run"("ingested_at_utc");

-- CreateIndex
CREATE INDEX "ix_dim_pipeline_run_source_system" ON "warehouse"."dim_pipeline_run"("source_system");

-- CreateIndex
CREATE UNIQUE INDEX "dim_date_full_date_key" ON "warehouse"."dim_date"("full_date");

-- CreateIndex
CREATE UNIQUE INDEX "dim_location_operational_location_id_key" ON "warehouse"."dim_location"("operational_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "dim_pos_source_source_system_key" ON "warehouse"."dim_pos_source"("source_system");

-- CreateIndex
CREATE INDEX "ix_dim_menu_item_location_key" ON "warehouse"."dim_menu_item"("location_key");

-- CreateIndex
CREATE INDEX "ix_dim_menu_item_name_norm" ON "warehouse"."dim_menu_item"("menu_name_norm");

-- CreateIndex
CREATE UNIQUE INDEX "dim_menu_item_location_key_menu_name_norm_is_current_key" ON "warehouse"."dim_menu_item"("location_key", "menu_name_norm", "is_current");

-- CreateIndex
CREATE INDEX "ix_fact_order_item_date_key" ON "warehouse"."fact_order_item"("date_key");

-- CreateIndex
CREATE INDEX "ix_fact_order_item_location_key" ON "warehouse"."fact_order_item"("location_key");

-- CreateIndex
CREATE INDEX "ix_fact_order_item_menu_item_key" ON "warehouse"."fact_order_item"("menu_item_key");

-- CreateIndex
CREATE INDEX "ix_fact_order_item_pipeline_run_id" ON "warehouse"."fact_order_item"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "ix_fact_order_item_loc_date_menu" ON "warehouse"."fact_order_item"("location_key", "date_key", "menu_item_key");

-- CreateIndex
CREATE UNIQUE INDEX "fact_order_item_pipeline_run_id_row_hash_key" ON "warehouse"."fact_order_item"("pipeline_run_id", "row_hash");

-- CreateIndex
CREATE INDEX "ix_fact_menu_hourly_pipeline" ON "warehouse"."fact_menu_hourly"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "ix_fact_menu_hourly_loc_date_hour" ON "warehouse"."fact_menu_hourly"("location_key", "date_key", "hour_of_day");

-- CreateIndex
CREATE UNIQUE INDEX "fact_menu_hourly_pipeline_run_id_date_key_location_key_menu_key" ON "warehouse"."fact_menu_hourly"("pipeline_run_id", "date_key", "location_key", "menu_item_key", "hour_of_day");

-- CreateIndex
CREATE INDEX "ix_fact_menu_daily_pipeline" ON "warehouse"."fact_menu_daily"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "ix_fact_menu_daily_loc_date_menu" ON "warehouse"."fact_menu_daily"("location_key", "date_key", "menu_item_key");

-- CreateIndex
CREATE UNIQUE INDEX "fact_menu_daily_pipeline_run_id_date_key_location_key_menu__key" ON "warehouse"."fact_menu_daily"("pipeline_run_id", "date_key", "location_key", "menu_item_key");

-- CreateIndex
CREATE INDEX "ix_pipeline_reco_run_metric" ON "warehouse"."pipeline_reconciliation_report"("pipeline_run_id", "metric_name");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_run_metrics_pipeline_run_id_key" ON "warehouse"."pipeline_run_metrics"("pipeline_run_id");

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_outputs" ADD CONSTRAINT "agent_outputs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_outputs" ADD CONSTRAINT "agent_outputs_analytics_id_fkey" FOREIGN KEY ("analytics_id") REFERENCES "analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_menu_items" ADD CONSTRAINT "analytics_menu_items_analytics_id_fkey" FOREIGN KEY ("analytics_id") REFERENCES "analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
