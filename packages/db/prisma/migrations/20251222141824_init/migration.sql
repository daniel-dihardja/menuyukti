-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
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
    "totalRevenue" DECIMAL(10,2),
    "avgOrderRevenue" DECIMAL(10,2),
    "avgOrderItems" DECIMAL(10,2),
    "avgPopularity" DECIMAL(10,6),
    "maxOrderItems" INTEGER,
    "minOrderItems" INTEGER,
    "maxOrderRevenue" DECIMAL(10,2),
    "minOrderRevenue" DECIMAL(10,2),
    "matrix_json" JSONB,
    "matrix_distribution_json" JSONB,
    "heatmap_json" JSONB,
    "popularity_json" JSONB,
    "insights_json" JSONB,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_menu_items" (
    "id" SERIAL NOT NULL,
    "analytics_id" INTEGER NOT NULL,
    "menu_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cogs" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_slug_key" ON "branches"("slug");

-- CreateIndex
CREATE INDEX "ix_analytics_branch_id" ON "analytics"("branch_id");

-- CreateIndex
CREATE INDEX "ix_menu_items_analytics_id" ON "analytics_menu_items"("analytics_id");

-- CreateIndex
CREATE INDEX "ix_menu_items_analytics_slug" ON "analytics_menu_items"("analytics_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_menu_item_per_analytics" ON "analytics_menu_items"("analytics_id", "slug");

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_menu_items" ADD CONSTRAINT "analytics_menu_items_analytics_id_fkey" FOREIGN KEY ("analytics_id") REFERENCES "analytics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
