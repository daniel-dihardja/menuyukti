-- CreateTable
CREATE TABLE "warehouse"."fact_order_basket_pair" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "date_key" INTEGER NOT NULL,
    "location_key" BIGINT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "menu_item_a_key" BIGINT NOT NULL,
    "menu_item_b_key" BIGINT NOT NULL,
    "pair_qty" DECIMAL(12,3) NOT NULL,
    "pair_count" INTEGER NOT NULL DEFAULT 1,
    "order_time" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_order_basket_pair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_fact_order_basket_pair_row"
ON "warehouse"."fact_order_basket_pair"("pipeline_run_id", "bill_number", "menu_item_a_key", "menu_item_b_key");

-- CreateIndex
CREATE INDEX "ix_fact_order_basket_pair_pipeline"
ON "warehouse"."fact_order_basket_pair"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "ix_fact_order_basket_pair_date_key"
ON "warehouse"."fact_order_basket_pair"("date_key");

-- CreateIndex
CREATE INDEX "ix_fact_order_basket_pair_location_key"
ON "warehouse"."fact_order_basket_pair"("location_key");

-- CreateIndex
CREATE INDEX "ix_fact_order_basket_pair_loc_date_pair"
ON "warehouse"."fact_order_basket_pair"("location_key", "date_key", "menu_item_a_key", "menu_item_b_key");

-- ETL Load Function (idempotent per pipeline run)
CREATE OR REPLACE FUNCTION "warehouse"."refresh_fact_order_basket_pair"(p_pipeline_run_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count BIGINT;
BEGIN
    DELETE FROM "warehouse"."fact_order_basket_pair"
    WHERE "pipeline_run_id" = p_pipeline_run_id;

    INSERT INTO "warehouse"."fact_order_basket_pair" (
        "pipeline_run_id",
        "date_key",
        "location_key",
        "bill_number",
        "menu_item_a_key",
        "menu_item_b_key",
        "pair_qty",
        "pair_count",
        "order_time"
    )
    SELECT
        a."pipeline_run_id",
        a."date_key",
        a."location_key",
        a."bill_number",
        LEAST(a."menu_item_key", b."menu_item_key") AS "menu_item_a_key",
        GREATEST(a."menu_item_key", b."menu_item_key") AS "menu_item_b_key",
        SUM(LEAST(a."qty", b."qty"))::DECIMAL(12,3) AS "pair_qty",
        1 AS "pair_count",
        MAX(GREATEST(a."order_time", b."order_time")) AS "order_time"
    FROM "warehouse"."fact_order_item" a
    INNER JOIN "warehouse"."fact_order_item" b
        ON a."pipeline_run_id" = b."pipeline_run_id"
       AND a."location_key" = b."location_key"
       AND a."date_key" = b."date_key"
       AND a."bill_number" = b."bill_number"
       AND a."menu_item_key" < b."menu_item_key"
    WHERE a."pipeline_run_id" = p_pipeline_run_id
    GROUP BY
        a."pipeline_run_id",
        a."date_key",
        a."location_key",
        a."bill_number",
        LEAST(a."menu_item_key", b."menu_item_key"),
        GREATEST(a."menu_item_key", b."menu_item_key");

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;
