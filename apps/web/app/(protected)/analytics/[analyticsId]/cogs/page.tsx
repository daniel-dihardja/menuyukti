export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { UpdateCogsForm } from "./update-cogs-form";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";

type PageProps = {
  params: Promise<{
    analyticsId?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("analytics");
  const tSales = await getTranslations("analytics.sales");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  // --------------------------------------------------
  // Fetch analytics (for display name)
  // --------------------------------------------------
  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      sourceFile: true,
      branchId: true,
      branch: {
        select: {
          currencyCode: true,
        },
      },
    },
  });

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;
  const currencyCode = analytics.branch?.currencyCode ?? "IDR";

  const analyticsOptions = await prisma.analytics.findMany({
    where: { branchId: analytics.branchId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      sourceFile: true,
    },
  });

  // --------------------------------------------------
  // Fetch menu items
  // --------------------------------------------------
  const rawMenuItems = await prisma.analyticsMenuItem.findMany({
    where: { analyticsId },
    orderBy: { quantity: "desc" },
    select: {
      id: true,
      menuName: true,
      cogs: true,
      quantity: true,
      totalRevenue: true,
      menuCategory: true,
    },
  });

  const menuItems = rawMenuItems.map((item) => ({
    id: item.id,
    menuName: item.menuName,
    cogs: item.cogs ? Number(item.cogs) : 0,
    quantity: item.quantity,
    totalRevenue: Number(item.totalRevenue),
    menuCategory: item.menuCategory,
  }));

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <AnalyticsPageShell
      title={t("cogs.edit")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: t("cogs.title") },
      ]}
    >
      <UpdateCogsForm
        analyticsId={analyticsId}
        menuItems={menuItems}
        analyticsOptions={analyticsOptions.map((item) => ({
          id: item.id,
          name: item.sourceFile ?? `Analytics #${item.id}`,
        }))}
        currencyCode={currencyCode}
      />
    </AnalyticsPageShell>
  );
}
