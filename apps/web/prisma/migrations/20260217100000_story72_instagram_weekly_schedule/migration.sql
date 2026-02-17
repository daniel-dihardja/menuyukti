-- CreateTable
CREATE TABLE "public"."instagram_weekly_schedules" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "week_start_date" DATE NOT NULL,
    "week_end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_weekly_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."instagram_weekly_schedule_entries" (
    "id" SERIAL NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "instagram_campaign_id" INTEGER,
    "instagram_post_id" INTEGER,
    "canonical_menu_name" TEXT NOT NULL,
    "canonical_menu_name_norm" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "daypart" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_weekly_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_instagram_weekly_schedule_branch_week_start"
ON "public"."instagram_weekly_schedules"("branch_id", "week_start_date");

-- CreateIndex
CREATE INDEX "ix_instagram_weekly_schedule_branch_week_start"
ON "public"."instagram_weekly_schedules"("branch_id", "week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_instagram_weekly_schedule_entry_key"
ON "public"."instagram_weekly_schedule_entries"("schedule_id", "canonical_menu_name_norm", "scheduled_for");

-- CreateIndex
CREATE INDEX "ix_instagram_weekly_schedule_entry_branch_scheduled_for"
ON "public"."instagram_weekly_schedule_entries"("branch_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "ix_instagram_weekly_schedule_entry_schedule_scheduled_for"
ON "public"."instagram_weekly_schedule_entries"("schedule_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "ix_instagram_weekly_schedule_entry_campaign_id"
ON "public"."instagram_weekly_schedule_entries"("instagram_campaign_id");

-- CreateIndex
CREATE INDEX "ix_instagram_weekly_schedule_entry_post_id"
ON "public"."instagram_weekly_schedule_entries"("instagram_post_id");

-- AddForeignKey
ALTER TABLE "public"."instagram_weekly_schedules"
ADD CONSTRAINT "instagram_weekly_schedules_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_weekly_schedule_entries"
ADD CONSTRAINT "instagram_weekly_schedule_entries_schedule_id_fkey"
FOREIGN KEY ("schedule_id") REFERENCES "public"."instagram_weekly_schedules"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_weekly_schedule_entries"
ADD CONSTRAINT "instagram_weekly_schedule_entries_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_weekly_schedule_entries"
ADD CONSTRAINT "instagram_weekly_schedule_entries_instagram_campaign_id_fkey"
FOREIGN KEY ("instagram_campaign_id") REFERENCES "public"."instagram_campaigns"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_weekly_schedule_entries"
ADD CONSTRAINT "instagram_weekly_schedule_entries_instagram_post_id_fkey"
FOREIGN KEY ("instagram_post_id") REFERENCES "public"."instagram_posts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
