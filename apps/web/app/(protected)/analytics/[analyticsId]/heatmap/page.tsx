export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
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
  // Fetch analytics snapshot
  // --------------------------------------------------
  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      sourceFile: true,
      heatmapJson: true,
    },
  });

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;

  // --------------------------------------------------
  // Parse + validate heatmap_json
  // --------------------------------------------------
  let dailyItems: DailyHeatmapInput[] = [];
  let weeklyItems: WeeklyHeatmapInput[] = [];

  try {
    const raw = analytics.heatmapJson as unknown;

    if (!Array.isArray(raw)) {
      throw new Error("heatmap_json is not an array");
    }

    dailyItems = raw.filter(
      (item: any): item is DailyHeatmapInput =>
        typeof item?.menu === "string" &&
        (Array.isArray(item?.dailyHeatmap) || Array.isArray(item?.daily_heatmap)),
    );

    weeklyItems = raw.filter(
      (item: any): item is WeeklyHeatmapInput =>
        typeof item?.menu === "string" &&
        (Array.isArray(item?.weeklyHeatmap) || Array.isArray(item?.weekly_heatmap)),
    );
  } catch (err) {
    console.error("Invalid heatmap_json:", err);
    notFound();
  }

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

  const marketerInsights = deriveHeatmapMarketerInsights(filteredDailyRows, daily.columnLabels);
  const analystInsights = deriveHeatmapAnalystInsights(
    filteredDailyRows,
    daily.columnLabels,
    filteredWeeklyRows,
    segmentedWeekly.labels,
  );
  const avgRowDemand = avgDemandPerRow(filteredDailyRows);

  // --------------------------------------------------
  // UI
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

      <HeatmapFilterBar filters={filters} sortWindows={daily.columnLabels} />

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
            rows={filteredDailyRows}
            columnLabels={daily.columnLabels}
            color="green"
          />
        </TabsContent>

        <TabsContent value="weekly">
          <HeatmapMatrix
            title={tHeatmap("weeklyTitle")}
            rows={filteredWeeklyRows}
            columnLabels={segmentedWeekly.labels}
            color="green"
          />
        </TabsContent>
      </Tabs>
    </AnalyticsPageShell>
  );
}
