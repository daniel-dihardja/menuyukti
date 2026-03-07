export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { routes } from "@/lib/routes";
import { notFound } from "next/navigation";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";
import {
  DAILY_HEATMAP_END_HOUR,
  DAILY_HEATMAP_START_HOUR,
} from "@/lib/heatmap-config";
import { adaptDailyHeatmapMatrix, adaptWeeklyHeatmapMatrix } from "./heatmap.adapters";
import { HeatmapView } from "./heatmap-view";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
};

export default async function Page({ params }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const tHeatmap = await getTranslations("analytics.heatmap");

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

  const dailyMatrix = adaptDailyHeatmapMatrix(
    run.menuHeatmaps,
    DAILY_HEATMAP_START_HOUR,
    DAILY_HEATMAP_END_HOUR,
  );
  const weeklyMatrix = adaptWeeklyHeatmapMatrix(run.menuHeatmaps);

  return (
    <AnalyticsPageShell
      title={tHeatmap("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tHeatmap("breadcrumb") },
      ]}
    >
      <section className="border rounded-md p-6 space-y-4">
        <PageHeading
          title={tHeatmap("heading")}
          description={tHeatmap("description")}
        />
        <Button asChild>
          <Link href={routes.analytics.sales}>Back to Sales</Link>
        </Button>
        <HeatmapView dailyMatrix={dailyMatrix} weeklyMatrix={weeklyMatrix} />
      </section>
    </AnalyticsPageShell>
  );
}
