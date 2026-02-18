export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { DecisionContractBanner } from "@/components/decision-contract-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

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
  serializeHeatmapFilterState,
} from "@/lib/analytics/heatmap-filter-state";
import {
  loadPipelineFreshnessMetadata,
  resolveAnalyticsMaterialization,
} from "@/lib/etl/latest-valid-materialization";
import {
  createDecisionApiContract,
  createDecisionContext,
} from "@/lib/contracts/decision-api-contract";

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
  const materialization = await resolveAnalyticsMaterialization({
    analyticsId,
    requiredField: "heatmapJson",
  });
  if (!materialization) notFound();

  const analytics = await prisma.analytics.findUnique({
    where: { id: materialization.resolvedAnalyticsId },
    select: {
      id: true,
      sourceFile: true,
      heatmapJson: true,
    },
  });

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analytics.id}`;
  const metadata = await loadPipelineFreshnessMetadata(analytics.id);
  const freshnessMinutes = metadata.freshnessMinutes;
  const isStale = Boolean(metadata.stale);
  const qualityStatus = String(metadata.qualityStatus ?? "").toLowerCase() || "unknown";
  const readiness: "ready" | "degraded" | "blocked" =
    qualityStatus === "failed" ? "blocked" : qualityStatus === "warn" || isStale ? "degraded" : "ready";

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
  const MAX_RENDER_ROWS = 120;
  const dailyRowsForRender = filteredDailyRows.slice(0, MAX_RENDER_ROWS);
  const weeklyRowsForRender = filteredWeeklyRows.slice(0, MAX_RENDER_ROWS);
  const isDailyTrimmed = filteredDailyRows.length > MAX_RENDER_ROWS;
  const isWeeklyTrimmed = filteredWeeklyRows.length > MAX_RENDER_ROWS;
  const heatmapExportParams = serializeHeatmapFilterState(filters);
  heatmapExportParams.set("dataset", "heatmap");
  heatmapExportParams.set("analyticsId", String(analyticsId));
  const heatmapExportHref = `/api/exports/analyst?${heatmapExportParams.toString()}`;

  const marketerInsights = deriveHeatmapMarketerInsights(dailyRowsForRender, daily.columnLabels);
  const analystInsights = deriveHeatmapAnalystInsights(
    dailyRowsForRender,
    daily.columnLabels,
    weeklyRowsForRender,
    segmentedWeekly.labels,
  );
  const avgRowDemand = avgDemandPerRow(dailyRowsForRender);
  const confidenceLabel =
    readiness === "ready" ? "high" : readiness === "degraded" ? "medium" : "blocked";
  const marketerAction =
    readiness === "blocked"
      ? "Heatmap timing guidance is blocked due to data readiness. Re-run ingestion and resolve quality before execution."
      : readiness === "degraded"
        ? `Use with caution: ${marketerInsights.suggestedAction}`
        : marketerInsights.suggestedAction;
  const analystAction =
    readiness === "blocked"
      ? "Analyst optimization guidance is blocked due to readiness policy. Fix freshness/quality before decisions."
      : readiness === "degraded"
        ? `Use with caution: ${analystInsights.suggestedAction}`
        : analystInsights.suggestedAction;
  const contract = createDecisionApiContract({
    surface: "heatmap",
    context: createDecisionContext({
      persona: "analyst",
      locationId: materialization.locationId,
      analyticsId: materialization.resolvedAnalyticsId,
      filterState: filters,
      trust: {
        qualityStatus:
          qualityStatus === "passed" || qualityStatus === "warn" || qualityStatus === "failed"
            ? qualityStatus
            : "unknown",
        freshnessMinutes,
        isStale,
        reasons: metadata.pipelineRunId ? [] : ["missing_pipeline_run"],
      },
      lineage: {
        pipelineRunId: metadata.pipelineRunId,
        sourceSystem: "warehouse",
        ingestedAtUtc: metadata.ingestedAtUtc,
      },
    }),
    evidence: [
      {
        source: "public_snapshot",
        entity: "public.analytics",
        metric: "daily_heatmap_rows",
        value: dailyRowsForRender.length,
        key: { analyticsId: materialization.resolvedAnalyticsId },
        pipelineRunId: metadata.pipelineRunId,
      },
      {
        source: "public_snapshot",
        entity: "public.analytics",
        metric: "weekly_heatmap_rows",
        value: weeklyRowsForRender.length,
        key: { analyticsId: materialization.resolvedAnalyticsId },
        pipelineRunId: metadata.pipelineRunId,
      },
    ],
  });

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
      <DecisionContractBanner
        contract={contract}
        fallbackApplied={materialization.fallbackApplied}
        fallbackLabel={`using latest valid materialization (#${materialization.resolvedAnalyticsId})`}
      />
      <section className="flex flex-wrap items-center gap-2">
        {materialization.fallbackApplied ? (
          <Badge variant="secondary">
            using latest valid materialization (#{materialization.resolvedAnalyticsId})
          </Badge>
        ) : null}
        <Badge variant={readiness === "blocked" ? "destructive" : readiness === "degraded" ? "secondary" : "default"}>
          readiness: {readiness}
        </Badge>
        <Badge variant="outline">quality: {qualityStatus}</Badge>
        {freshnessMinutes !== null ? (
          <Badge variant={isStale ? "destructive" : "secondary"}>freshness: {freshnessMinutes}m</Badge>
        ) : null}
        <Badge variant="outline">confidence: {confidenceLabel}</Badge>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <Link href={heatmapExportHref}>Export Heatmap CSV</Link>
        </Button>
      </section>
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
            <p>{marketerAction}</p>
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
            <p>{analystAction}</p>
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
            Insights shown above are deterministic transforms of these bucketed totals.
          </p>
          <p>
            Interpretation guidance: marketers should prioritize peak windows and avoid low windows for campaign posts;
            analysts should use bias and concentration signals to validate operational and profitability decisions.
          </p>
          <p>
            Confidence is constrained by readiness. If quality is degraded or freshness is stale, action language should be treated as lower-trust.
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
