export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { UpdateCogsForm } from "./update-cogs-form";
import { getAppCurrencyCode } from "@/lib/app-currency";
import { routes } from "@/lib/routes";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  ANALYTICS_RUN_QUERY,
  MENU_ENGINEERING_MATRIX_QUERY,
  type AnalyticsRunData,
  type MenuEngineeringMatrixData,
} from "@/lib/graphql/queries";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";

type PageProps = {
  params: Promise<{
    analyticsId?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const t = await getTranslations("analytics");
  const tSales = await getTranslations("analytics.sales");

  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  const id = String(analyticsId);
  const [runData, matrixData] = await Promise.all([
    graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, { id }, userId),
    graphqlQuery<MenuEngineeringMatrixData>(
      MENU_ENGINEERING_MATRIX_QUERY,
      { id },
      userId
    ),
  ]);

  const run = runData.analyticsRun;
  if (!run) notFound();

  const analyticsName = run.name ?? run.filename ?? `Analytics #${analyticsId}`;
  const currencyCode = getAppCurrencyCode();

  // Enrich COGS rows with quantity/totalRevenue from the matrix
  const byMenu = new Map(
    matrixData.menuEngineeringMatrix?.items.map((row) => [
      row.menu,
      { quantity: row.quantity, totalRevenue: row.totalRevenue },
    ]) ?? [],
  );
  const menuItems = run.menuItemCogs
    .map((cog) => {
      const extra = byMenu.get(cog.menu);
      return {
        id: cog.id,
        menuName: cog.menu,
        cogs: cog.cogs,
        quantity: extra?.quantity ?? 0,
        totalRevenue: extra?.totalRevenue ?? 0,
        menuCategory: cog.menuCategory ?? null,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);

  const analyticsOptions: Array<{ id: number; name: string }> = [];

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
        analyticsOptions={analyticsOptions}
        currencyCode={currencyCode}
      />
    </AnalyticsPageShell>
  );
}
