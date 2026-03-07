export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { UpdateCogsForm } from "./update-cogs-form";
import { getAppCurrencyCode } from "@/lib/app-currency";
import { summarizeCogsCompleteness } from "@/lib/analytics/cogs-completeness";
import { routes } from "@/lib/routes";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";
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
  // Fetch analytics run from GraphQL
  // --------------------------------------------------
  const data = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, {
    id: String(analyticsId),
  });
  const run = data.analytics_run;
  if (!run) notFound();

  const analyticsName = run.name ?? run.filename ?? `Analytics #${analyticsId}`;
  const currencyCode = getAppCurrencyCode();

  // Build menu items from menuItemCogs + menuEngineeringMatrix (for quantity/totalRevenue)
  const byMenu = new Map(
    run.menuEngineeringMatrix?.items.map((row) => [
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

  const cogsCompleteness = summarizeCogsCompleteness(menuItems);

  // No list of other runs from GraphQL yet; pass empty options
  const analyticsOptions: Array<{ id: number; name: string }> = [];

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
        cogsCompleteness={cogsCompleteness}
        analyticsOptions={analyticsOptions}
        currencyCode={currencyCode}
      />
    </AnalyticsPageShell>
  );
}
