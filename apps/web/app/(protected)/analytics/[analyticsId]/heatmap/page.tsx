export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { routes } from "@/lib/routes";
import { notFound } from "next/navigation";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

// Server-safe adapters
import {
  adaptDailyHeatmapMatrix,
  adaptWeeklyHeatmapMatrix,
  type DailyHeatmapInput,
  type WeeklyHeatmapInput,
} from "./heatmap.adapters";

// Client UI component
import { HeatmapMatrix } from "./heatmap-matrix";
import { HeatmapFilterBar } from "./heatmap-filter-bar";
import {
  avgDemandPerRow,
  deriveHeatmapAnalystInsights,
  deriveHeatmapMarketerInsights,
  formatPct,
} from "@/lib/analytics/heatmap-insights";
import {
  applyHeatmapFilterState,
  applyWeeklySegment,
  parseHeatmapFilterState,
} from "@/lib/analytics/heatmap-filter-state";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const tHeatmap = await getTranslations("analytics.heatmap");

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

  const resolvedAnalyticsId = Number(run.id);
  const materialization = {
    requestedAnalyticsId: analyticsId,
    resolvedAnalyticsId,
    locationId: run.locationId,
    fallbackApplied: false,
  };

  const analyticsName = run.name ?? run.filename ?? `Analytics #${resolvedAnalyticsId}`;

  // --------------------------------------------------
  // Build heatmap items from GraphQL menu_heatmaps
  // --------------------------------------------------
  const dailyItems: DailyHeatmapInput[] = run.menu_heatmaps
    .filter((h) => h.daily_heatmap?.length)
    .map((h) => ({
      menu: h.menu,
      daily_heatmap: h.daily_heatmap.map((d) => ({ hour: d.hour, quantity: d.quantity })),
    }));
  const weeklyItems: WeeklyHeatmapInput[] = run.menu_heatmaps
    .filter((h) => h.weekly_heatmap?.length)
    .map((h) => ({
      menu: h.menu,
      weekly_heatmap: h.weekly_heatmap.map((w) => ({ day: w.day, quantity: w.quantity })),
    }));

  if (!dailyItems.length && !weeklyItems.length) {
    notFound();
  }

  // --------------------------------------------------
  // Daily window (UI-ready)
  // --------------------------------------------------
  const START_HOUR = 8;
  const END_HOUR = 18;

  const daily = adaptDailyHeatmapMatrix(dailyItems, START_HOUR, END_HOUR);

  const weekly = adaptWeeklyHeatmapMatrix(weeklyItems);
  const filters = parseHeatmapFilterState(await searchParams);
  const filteredDailyRows = applyHeatmapFilterState(daily.rows, daily.columnLabels, filters);
  const segmentedWeekly = applyWeeklySegment(weekly.rows, weekly.columnLabels, filters.segment);
  const filteredWeeklyRows = applyHeatmapFilterState(segmentedWeekly.rows, segmentedWeekly.labels, filters);
  const MAX_RENDER_ROWS = 120;
  const dailyRowsForRender = filteredDailyRows.slice(0, MAX_RENDER_ROWS);
  const weeklyRowsForRender = filteredWeeklyRows.slice(0, MAX_RENDER_ROWS);
  const isDailyTrimmed = filteredDailyRows.length > MAX_RENDER_ROWS;
  const isWeeklyTrimmed = filteredWeeklyRows.length > MAX_RENDER_ROWS;
  const marketerInsights = deriveHeatmapMarketerInsights(dailyRowsForRender, daily.columnLabels);
  const analystInsights = deriveHeatmapAnalystInsights(
    dailyRowsForRender,
    daily.columnLabels,
    weeklyRowsForRender,
    segmentedWeekly.labels,
  );
  const avgRowDemand = avgDemandPerRow(dailyRowsForRender);

  // --------------------------------------------------
  // UI (only what GraphQL provides: heatmap data + derived insights)
  // --------------------------------------------------
  return (
    <AnalyticsPageShell
      title={tHeatmap("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tHeatmap("breadcrumb") },
      ]}
    >
      <PageHeading
        title={tHeatmap("heading")}
        description={tHeatmap("description")}
      />
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Marketer Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Peak: {marketerInsights.peakWindow?.label ?? "—"}</Badge>
              <Badge variant="secondary">Weak: {marketerInsights.weakWindow?.label ?? "—"}</Badge>
            </div>
            <p className="text-muted-foreground">
              Peak volume: {marketerInsights.peakWindow?.totalQty ?? 0} orders.
              Menu focus: {marketerInsights.menuFocusAtPeak?.menu ?? "—"}.
            </p>
            <p>{marketerInsights.suggestedAction}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analyst Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Underperforming: {analystInsights.underperformingWindow?.label ?? "—"}
              </Badge>
              <Badge variant="outline">Bias: {analystInsights.weekdayWeekendBias}</Badge>
            </div>
            <p className="text-muted-foreground">
              Concentration risk: {analystInsights.concentrationRisk?.menu ?? "—"} (
              {analystInsights.concentrationRisk ? formatPct(analystInsights.concentrationRisk.share) : "0.0%"})
              . Avg demand per menu row: {avgRowDemand.toFixed(1)}.
            </p>
            <p>{analystInsights.suggestedAction}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Method Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Daily heatmaps aggregate menu quantities by hour bucket. Weekly heatmaps aggregate by weekday bucket.
            Insights above are derived from these bucketed totals.
          </p>
          <p>
            Marketers: prioritize peak windows; avoid low windows for campaign posts. Analysts: use bias and concentration signals for operational decisions.
          </p>
        </CardContent>
      </Card>

      <HeatmapFilterBar filters={filters} sortWindows={daily.columnLabels} />
      {(isDailyTrimmed || isWeeklyTrimmed) ? (
        <p className="text-xs text-muted-foreground">
          Large dataset safeguard active: rendering limited to first {MAX_RENDER_ROWS} rows after filters.
          Refine filters/top-N for more focused analysis.
        </p>
      ) : null}

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 justify-start sm:inline-flex sm:w-fit">
          <TabsTrigger value="daily" className="w-full flex-1 sm:w-auto sm:flex-none">
            {tHeatmap("tabs.daily")}
          </TabsTrigger>
          <TabsTrigger value="weekly" className="w-full flex-1 sm:w-auto sm:flex-none">
            {tHeatmap("tabs.weekly")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <HeatmapMatrix
            title={tHeatmap("dailyTitle", {
              startHour: START_HOUR,
              endHour: END_HOUR,
            })}
            rows={dailyRowsForRender}
            columnLabels={daily.columnLabels}
            color="green"
            density={filters.density}
          />
        </TabsContent>

        <TabsContent value="weekly">
          <HeatmapMatrix
            title={tHeatmap("weeklyTitle")}
            rows={weeklyRowsForRender}
            columnLabels={segmentedWeekly.labels}
            color="green"
            density={filters.density}
          />
        </TabsContent>
      </Tabs>
    </AnalyticsPageShell>
  );
}
