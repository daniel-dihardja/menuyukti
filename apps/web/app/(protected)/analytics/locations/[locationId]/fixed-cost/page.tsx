export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";

import { FixedCostForm } from "./fixed-cost-form";

type PageProps = {
  params: Promise<{
    locationId?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("branches.fixedCosts");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { locationId: locationIdParam } = await params;
  if (!locationIdParam) notFound();

  const branchId = Number(locationIdParam);
  if (!Number.isInteger(branchId)) notFound();

  // --------------------------------------------------
  // Fetch branch (for display name + scope validation)
  // --------------------------------------------------
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      name: true,
      slug: true,
      currencyCode: true,
    },
  });

  if (!branch) notFound();

  // --------------------------------------------------
  // Fetch fixed costs for branch
  // --------------------------------------------------
  const rawFixedCosts = await prisma.fixedCost.findMany({
    where: { branchId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      amount: true,
      category: true,
      notes: true,
      isActive: true,
    },
  });

  const fixedCosts = rawFixedCosts.map((cost) => ({
    id: cost.id,
    name: cost.name,
    amount: Number(cost.amount),
    category: cost.category ?? "",
    notes: cost.notes ?? "",
    isActive: cost.isActive,
  }));

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <AnalyticsPageShell
      title={t("title")}
      breadcrumbs={[
        { label: t("breadcrumbs.branches"), href: routes.analytics.branches },
        { label: branch.name },
        { label: t("breadcrumbs.fixedCosts") },
      ]}
    >
      <PageHeading title={t("title")} description={t("description")} />

      <FixedCostForm
        branchId={branch.id}
        fixedCosts={fixedCosts}
        currencyCode={branch.currencyCode ?? "IDR"}
      />
    </AnalyticsPageShell>
  );
}
