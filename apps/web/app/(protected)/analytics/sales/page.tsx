export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { AnalyticsSalesClient } from "./analytics-sales-client";

export default async function Page() {
  const t = await getTranslations("analytics.sales");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  const hasBranches = branches.length > 0;

  // still mocked for now
  const uploads: { id: number; name: string }[] = [];

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("title")} />

        <main className="p-4 space-y-4 max-w-6xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {!hasBranches ? (
            /* ---------------------------------------------
             * Empty state: no branches
             * --------------------------------------------- */
            <div className="border rounded-md p-8 text-center space-y-4">
              <h2 className="text-lg font-medium">{t("noBranches.title")}</h2>
              <p className="text-muted-foreground">
                {t("noBranches.description")}
              </p>
              <Button asChild>
                <Link href={routes.analytics.branchesCreate}>
                  {t("noBranches.cta")}
                </Link>
              </Button>
            </div>
          ) : (
            /* ---------------------------------------------
             * Interactive analytics UI
             * --------------------------------------------- */
            <AnalyticsSalesClient
              branches={branches}
              uploads={uploads}
              labels={{
                create: t("create"),
                noAnalytics: {
                  title: t("noAnalytics.title"),
                  description: t("noAnalytics.description"),
                },
                table: {
                  index: t("table.index"),
                  fileName: t("table.fileName"),
                  action: t("table.action"),
                  view: t("table.view"),
                },
              }}
            />
          )}
        </main>
      </div>
    </SidebarInset>
  );
}
