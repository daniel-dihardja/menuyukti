-- CreateTable
CREATE TABLE "public"."instagram_campaigns" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "external_campaign_id" TEXT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "objective" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."instagram_posts" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "campaign_id" INTEGER,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "platform_post_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "media_type" TEXT,
    "caption" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_instagram_campaign_branch_starts_at"
ON "public"."instagram_campaigns"("branch_id", "starts_at");

-- CreateIndex
CREATE INDEX "ix_instagram_campaign_external_id"
ON "public"."instagram_campaigns"("external_campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_instagram_campaign_branch_platform_external"
ON "public"."instagram_campaigns"("branch_id", "platform", "external_campaign_id");

-- CreateIndex
CREATE INDEX "ix_instagram_post_branch_published_at"
ON "public"."instagram_posts"("branch_id", "published_at");

-- CreateIndex
CREATE INDEX "ix_instagram_post_platform_post_id"
ON "public"."instagram_posts"("platform_post_id");

-- CreateIndex
CREATE INDEX "ix_instagram_post_campaign_id"
ON "public"."instagram_posts"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_instagram_post_branch_platform_external"
ON "public"."instagram_posts"("branch_id", "platform", "platform_post_id");

-- AddForeignKey
ALTER TABLE "public"."instagram_campaigns"
ADD CONSTRAINT "instagram_campaigns_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_posts"
ADD CONSTRAINT "instagram_posts_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_posts"
ADD CONSTRAINT "instagram_posts_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "public"."instagram_campaigns"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
