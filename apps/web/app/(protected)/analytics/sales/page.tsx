export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
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

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title={t("title")}
          breadcrumbs={[{ label: t("title") }]}
        />

        <main className="p-4 space-y-6 max-w-6xl mx-auto">
          {!hasBranches ? (
            <Card className="p-8 text-center space-y-4">
              <h2 className="text-lg font-medium">{t("noBranches.title")}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("noBranches.description")}
              </p>
              <Button asChild size="lg">
                <Link href={routes.analytics.branchesCreate}>
                  {t("noBranches.cta")}
                </Link>
              </Button>
            </Card>
          ) : (
            <section className="space-y-3">
              <AnalyticsSalesClient branches={branches} />
            </section>
          )}
        </main>
      </div>
    </SidebarInset>
  );
}
