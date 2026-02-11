export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { BranchesTable } from "./branches-table";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";

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
    <AnalyticsPageShell title={t("title")} breadcrumbs={[{ label: t("title") }]}>
      <PageHeading title={t("title")} description={t("description")} />

      <div className="flex justify-start">
        <Button asChild>
          <Link href={routes.analytics.branchesCreate}>{t("create")}</Link>
        </Button>
      </div>

      <BranchesTable
        branches={branches}
        indexLabel={t("table.index")}
        branchNameLabel={t("table.branchName")}
        actionLabel={t("table.action")}
        emptyLabel={t("table.empty")}
      />
    </AnalyticsPageShell>
  );
}
