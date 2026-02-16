-- CreateTable
CREATE TABLE "public"."instagram_post_promoted_items" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "instagram_post_id" INTEGER NOT NULL,
    "canonical_menu_name" TEXT NOT NULL,
    "canonical_menu_name_norm" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_post_promoted_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_instagram_post_promoted_item_post_menu_norm"
ON "public"."instagram_post_promoted_items"("instagram_post_id", "canonical_menu_name_norm");

-- CreateIndex
CREATE INDEX "ix_instagram_post_promoted_item_branch_menu_norm"
ON "public"."instagram_post_promoted_items"("branch_id", "canonical_menu_name_norm");

-- CreateIndex
CREATE INDEX "ix_instagram_post_promoted_item_post_id"
ON "public"."instagram_post_promoted_items"("instagram_post_id");

-- AddForeignKey
ALTER TABLE "public"."instagram_post_promoted_items"
ADD CONSTRAINT "instagram_post_promoted_items_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."instagram_post_promoted_items"
ADD CONSTRAINT "instagram_post_promoted_items_instagram_post_id_fkey"
FOREIGN KEY ("instagram_post_id") REFERENCES "public"."instagram_posts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
