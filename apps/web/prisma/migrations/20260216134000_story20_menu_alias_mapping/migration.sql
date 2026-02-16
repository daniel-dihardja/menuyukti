-- CreateTable
CREATE TABLE "public"."menu_alias" (
    "id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "alias_name" TEXT NOT NULL,
    "alias_name_norm" TEXT NOT NULL,
    "canonical_menu_name" TEXT NOT NULL,
    "canonical_menu_name_norm" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_alias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_menu_alias_branch_alias_norm"
ON "public"."menu_alias"("branch_id", "alias_name_norm");

-- CreateIndex
CREATE INDEX "ix_menu_alias_branch_canonical_norm"
ON "public"."menu_alias"("branch_id", "canonical_menu_name_norm");

-- AddForeignKey
ALTER TABLE "public"."menu_alias"
ADD CONSTRAINT "menu_alias_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
