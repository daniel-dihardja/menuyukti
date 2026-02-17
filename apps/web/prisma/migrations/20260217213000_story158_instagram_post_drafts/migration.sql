CREATE TABLE "public"."instagram_schedule_post_drafts" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "analytics_id" INTEGER,
    "schedule_id" INTEGER NOT NULL,
    "schedule_entry_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "campaign_objective" TEXT,
    "offer_type" TEXT,
    "caption" TEXT NOT NULL,
    "call_to_action" TEXT,
    "hashtags_json" JSONB,
    "suggested_publish_at" TIMESTAMP(3),
    "generation_input_json" JSONB,
    "generation_output_json" JSONB,
    "source_signals_json" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instagram_schedule_post_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."instagram_schedule_post_draft_history" (
    "id" SERIAL NOT NULL,
    "draft_id" INTEGER NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "instagram_schedule_post_draft_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_instagram_schedule_post_draft_schedule_entry_id"
ON "public"."instagram_schedule_post_drafts"("schedule_entry_id");

CREATE INDEX "ix_instagram_schedule_post_draft_branch_status"
ON "public"."instagram_schedule_post_drafts"("branch_id", "status");

CREATE INDEX "ix_instagram_schedule_post_draft_schedule_id"
ON "public"."instagram_schedule_post_drafts"("schedule_id");

CREATE INDEX "ix_instagram_schedule_post_draft_analytics_id"
ON "public"."instagram_schedule_post_drafts"("analytics_id");

CREATE INDEX "ix_instagram_schedule_post_draft_history_draft_created_at"
ON "public"."instagram_schedule_post_draft_history"("draft_id", "created_at");

ALTER TABLE "public"."instagram_schedule_post_drafts"
ADD CONSTRAINT "instagram_schedule_post_drafts_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."instagram_schedule_post_drafts"
ADD CONSTRAINT "instagram_schedule_post_drafts_analytics_id_fkey"
FOREIGN KEY ("analytics_id") REFERENCES "public"."analytics"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."instagram_schedule_post_drafts"
ADD CONSTRAINT "instagram_schedule_post_drafts_schedule_id_fkey"
FOREIGN KEY ("schedule_id") REFERENCES "public"."instagram_weekly_schedules"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."instagram_schedule_post_drafts"
ADD CONSTRAINT "instagram_schedule_post_drafts_schedule_entry_id_fkey"
FOREIGN KEY ("schedule_entry_id") REFERENCES "public"."instagram_weekly_schedule_entries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."instagram_schedule_post_draft_history"
ADD CONSTRAINT "instagram_schedule_post_draft_history_draft_id_fkey"
FOREIGN KEY ("draft_id") REFERENCES "public"."instagram_schedule_post_drafts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
