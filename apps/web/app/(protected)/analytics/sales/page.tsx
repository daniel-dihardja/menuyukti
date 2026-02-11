export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { AnalyticsSalesClient } from "./analytics-sales-client";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";

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
    <AnalyticsPageShell title={t("title")} breadcrumbs={[{ label: t("title") }]}>
      <PageHeading title={t("title")} description={t("description")} />

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
    </AnalyticsPageShell>
  );
}
