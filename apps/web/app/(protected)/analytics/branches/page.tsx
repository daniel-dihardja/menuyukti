export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { BranchesTable } from "./branches-table";

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title={t("title")}
          breadcrumbs={[{ label: t("title") }]}
        />

        <main className="p-4 space-y-3 max-w-6xl mx-auto">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </header>

          <BranchesTable
            branches={branches}
            indexLabel={t("table.index")}
            branchNameLabel={t("table.branchName")}
            actionLabel={t("table.action")}
            emptyLabel={t("table.empty")}
          />

          <div className="flex justify-end">
            <Button asChild>
              <Link href={routes.analytics.branchesCreate}>{t("create")}</Link>
            </Button>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
