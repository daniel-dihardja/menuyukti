export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { Button } from "@workspace/ui/components/button";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { notFound } from "next/navigation";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";
import { getAppCurrencyCode, getAppCurrencyLocale } from "@/lib/app-currency";
import { matrixItemsToGroupedRows } from "@/lib/analytics/matrix-page-adapter";
import { MatrixCategoryTables } from "./matrix-category-tables";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
};

export default async function Page({ params }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const tMatrix = await getTranslations("analytics.matrix");

  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  const data = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, {
    id: String(analyticsId),
  });
  const run = data.analyticsRun;
  if (!run) notFound();

  const analyticsName =
    run.name ?? run.filename ?? `Analytics #${run.id}`;

  const items = run.menuEngineeringMatrix?.items ?? null;
  const grouped = matrixItemsToGroupedRows(items);
  const totalItems =
    grouped.star.length +
    grouped.plow_horse.length +
    grouped.puzzle.length +
    grouped.low_end.length;

  const locale = getAppCurrencyLocale();
  const currency = getAppCurrencyCode();

  return (
    <AnalyticsPageShell
      title={tMatrix("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMatrix("breadcrumb") },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading
          title={tMatrix("heading")}
          description={tMatrix("description")}
        />
        <Button asChild>
          <Link href={routes.analytics.sales}>Back to Sales</Link>
        </Button>

        {totalItems === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No matrix data for this run.
          </div>
        ) : (
          <MatrixCategoryTables
            grouped={grouped}
            locale={locale}
            currency={currency}
          />
        )}
      </section>
    </AnalyticsPageShell>
  );
}
