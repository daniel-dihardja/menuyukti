import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { loadInstagramAttribution } from "@/lib/analytics/instagram-attribution";
import {
  evaluateAttributionConfidence,
  parseConfidenceConfig,
} from "@/lib/analytics/instagram-attribution-confidence";
import { parseMatrixFilterState } from "@/lib/analytics/matrix-filter-state";
import { applyMatrixFilterState } from "@/lib/analytics/matrix-filter-engine";
import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";
import { parsePairTypeFilter } from "@/lib/analytics/pair-type";
import { cogsIssue, summarizeCogsCoverage } from "@/lib/analytics/cogs-completeness";
import { evaluateCogsReadiness } from "@/lib/analytics/cogs-readiness";
import {
  applyHeatmapFilterState,
  applyWeeklySegment,
  parseHeatmapFilterState,
} from "@/lib/analytics/heatmap-filter-state";
import {
  adaptDailyHeatmapMatrix,
  adaptWeeklyHeatmapMatrix,
  type DailyHeatmapInput,
  type WeeklyHeatmapInput,
} from "@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap.adapters";
import { ATTRIBUTION_EXPORT_COLUMNS, buildAttributionExportRows } from "@/lib/export/attribution-export";
import { toCsv } from "@/lib/export/csv";

type ExportDataset = "matrix" | "pairs" | "combos" | "heatmap" | "attribution";

function csvResponse(filename: string, csv: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}

function parseDataset(raw: string | null): ExportDataset | null {
  if (raw === "matrix" || raw === "pairs" || raw === "combos" || raw === "heatmap" || raw === "attribution") return raw;
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const dataset = parseDataset(searchParams.get("dataset"));
    if (!dataset) {
      return NextResponse.json(
        { error: "INVALID_DATASET", expected: ["matrix", "pairs", "combos", "heatmap", "attribution"] },
        { status: 400 },
      );
    }

    const generatedAt = new Date().toISOString();

    if (dataset === "attribution") {
      const analyticsId = Number(searchParams.get("analyticsId"));
      if (!Number.isInteger(analyticsId)) {
        return NextResponse.json({ error: "INVALID_ANALYTICS_ID" }, { status: 400 });
      }

      const fromParam = searchParams.get("from");
      const toParam = searchParams.get("to");
      const from = fromParam ? new Date(fromParam) : null;
      const to = toParam ? new Date(toParam) : null;
      if (fromParam && Number.isNaN(from?.getTime())) {
        return NextResponse.json({ error: "INVALID_FROM_DATE" }, { status: 400 });
      }
      if (toParam && Number.isNaN(to?.getTime())) {
        return NextResponse.json({ error: "INVALID_TO_DATE" }, { status: 400 });
      }

      const limit = Number(searchParams.get("limit") ?? "500");
      if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
        return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
      }

      const analytics = await prisma.analytics.findUnique({
        where: { id: analyticsId },
        select: {
          id: true,
          locationId: true,
          periodStart: true,
          periodEnd: true,
        },
      });
      if (!analytics) {
        return NextResponse.json({ error: "ANALYTICS_NOT_FOUND" }, { status: 404 });
      }

      const etlJob = await prisma.etlJob.findFirst({
        where: {
          analyticsId,
          status: "succeeded",
          pipelineRunId: { not: null },
        },
        orderBy: { finishedAt: "desc" },
        select: { pipelineRunId: true },
      });
      const pipelineRunRows = etlJob?.pipelineRunId
        ? await prisma.$queryRaw<Array<{ ingested_at_utc: Date; quality_status: string }>>`
            SELECT ingested_at_utc, quality_status
            FROM warehouse.dim_pipeline_run
            WHERE pipeline_run_id = CAST(${etlJob.pipelineRunId} AS UUID)
            LIMIT 1
          `
        : [];
      const pipelineRun = pipelineRunRows[0];
      const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
      const freshnessMinutes = pipelineRun
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(pipelineRun.ingested_at_utc).getTime()) / 60_000),
          )
        : null;
      const isStale = freshnessMinutes !== null && freshnessMinutes > freshnessSlaMinutes;
      const qualityStatus = pipelineRun?.quality_status ?? null;

      const confidenceConfig = parseConfidenceConfig(searchParams);

      const rows = await loadInstagramAttribution({
        locationId: analytics.locationId,
        from,
        to,
        limit,
      });

      const confidenceByKey = new Map(
        rows.map((row) => {
          const key = `${row.instagramPostId}::${row.canonicalMenuName.trim().toLowerCase()}`;
          const confidence = evaluateAttributionConfidence(
            row,
            confidenceConfig,
            { qualityStatus, isStale },
          );
          return [key, confidence] as const;
        }),
      );

      const exportRows = buildAttributionExportRows(
        rows,
        {
          generatedAt,
          analyticsId: analytics.id,
          locationId: analytics.locationId,
          periodStart: analytics.periodStart,
          periodEnd: analytics.periodEnd,
          qualityStatus,
          freshnessMinutes,
          isStale,
          minActiveDays: confidenceConfig.minActiveDays,
          minCoverageRatio: confidenceConfig.minCoverageRatio,
          from,
          to,
          limit,
        },
        confidenceByKey,
      );

      const csv = toCsv(exportRows, [...ATTRIBUTION_EXPORT_COLUMNS]);
      return csvResponse(`analyst-attribution-${analytics.id}.csv`, csv);
    }

    if (dataset === "heatmap") {
      const analyticsId = Number(searchParams.get("analyticsId"));
      if (!Number.isInteger(analyticsId)) {
        return NextResponse.json({ error: "INVALID_ANALYTICS_ID" }, { status: 400 });
      }

      const analytics = await prisma.analytics.findUnique({
        where: { id: analyticsId },
        select: {
          id: true,
          locationId: true,
          periodStart: true,
          periodEnd: true,
          heatmapJson: true,
        },
      });

      if (!analytics || !analytics.heatmapJson || !Array.isArray(analytics.heatmapJson)) {
        return NextResponse.json({ error: "HEATMAP_NOT_FOUND" }, { status: 404 });
      }

      const dailyItems = (analytics.heatmapJson as unknown[]).filter(
        (item: any): item is DailyHeatmapInput =>
          typeof item?.menu === "string" &&
          (Array.isArray(item?.dailyHeatmap) || Array.isArray(item?.daily_heatmap)),
      );
      const weeklyItems = (analytics.heatmapJson as unknown[]).filter(
        (item: any): item is WeeklyHeatmapInput =>
          typeof item?.menu === "string" &&
          (Array.isArray(item?.weeklyHeatmap) || Array.isArray(item?.weekly_heatmap)),
      );

      const daily = adaptDailyHeatmapMatrix(dailyItems, 8, 18);
      const weekly = adaptWeeklyHeatmapMatrix(weeklyItems);
      const filters = parseHeatmapFilterState(Object.fromEntries(searchParams.entries()));
      const filteredDailyRows = applyHeatmapFilterState(daily.rows, daily.columnLabels, filters);
      const segmentedWeekly = applyWeeklySegment(weekly.rows, weekly.columnLabels, filters.segment);
      const filteredWeeklyRows = applyHeatmapFilterState(segmentedWeekly.rows, segmentedWeekly.labels, filters);

      const etlJob = await prisma.etlJob.findFirst({
        where: {
          analyticsId,
          status: "succeeded",
          pipelineRunId: { not: null },
        },
        orderBy: { finishedAt: "desc" },
        select: { pipelineRunId: true },
      });
      const pipelineRunRows = etlJob?.pipelineRunId
        ? await prisma.$queryRaw<Array<{ ingested_at_utc: Date; quality_status: string }>>`
            SELECT ingested_at_utc, quality_status
            FROM warehouse.dim_pipeline_run
            WHERE pipeline_run_id = CAST(${etlJob.pipelineRunId} AS UUID)
            LIMIT 1
          `
        : [];

      const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
      const pipelineRun = pipelineRunRows[0];
      const freshnessMinutes = pipelineRun
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(pipelineRun.ingested_at_utc).getTime()) / 60_000),
          )
        : null;
      const isStale = freshnessMinutes !== null && freshnessMinutes > freshnessSlaMinutes;
      const qualityStatus = String(pipelineRun?.quality_status ?? "").toLowerCase() || "unknown";
      const readiness =
        qualityStatus === "failed"
          ? "blocked"
          : qualityStatus === "warn" || isStale
            ? "degraded"
            : "ready";

      const dailyRows = filteredDailyRows.flatMap((row) =>
        row.values.map((value, index) => ({
          dataset,
          generated_at: generatedAt,
          analytics_id: analytics.id,
          location_id: analytics.locationId,
          period_start: analytics.periodStart,
          period_end: analytics.periodEnd,
          grain: "daily",
          menu_item: row.label,
          window_label: daily.columnLabels[index] ?? `slot-${index + 1}`,
          quantity: value,
          readiness,
          quality_status: qualityStatus,
          freshness_minutes: freshnessMinutes,
          segment: filters.segment,
          q: filters.q,
          top: filters.top,
          sort: filters.sort,
          sort_window: filters.sortWindow,
          order: filters.order,
        })),
      );

      const weeklyRows = filteredWeeklyRows.flatMap((row) =>
        row.values.map((value, index) => ({
          dataset,
          generated_at: generatedAt,
          analytics_id: analytics.id,
          location_id: analytics.locationId,
          period_start: analytics.periodStart,
          period_end: analytics.periodEnd,
          grain: "weekly",
          menu_item: row.label,
          window_label: segmentedWeekly.labels[index] ?? `slot-${index + 1}`,
          quantity: value,
          readiness,
          quality_status: qualityStatus,
          freshness_minutes: freshnessMinutes,
          segment: filters.segment,
          q: filters.q,
          top: filters.top,
          sort: filters.sort,
          sort_window: filters.sortWindow,
          order: filters.order,
        })),
      );

      const csv = toCsv([...dailyRows, ...weeklyRows], [
        "dataset",
        "generated_at",
        "analytics_id",
        "location_id",
        "period_start",
        "period_end",
        "grain",
        "menu_item",
        "window_label",
        "quantity",
        "readiness",
        "quality_status",
        "freshness_minutes",
        "segment",
        "q",
        "top",
        "sort",
        "sort_window",
        "order",
      ]);

      return csvResponse(`analyst-heatmap-${analytics.id}.csv`, csv);
    }

    if (dataset === "matrix") {
      const analyticsId = Number(searchParams.get("analyticsId"));
      if (!Number.isInteger(analyticsId)) {
        return NextResponse.json({ error: "INVALID_ANALYTICS_ID" }, { status: 400 });
      }

      const analytics = await prisma.analytics.findUnique({
        where: { id: analyticsId },
        select: {
          id: true,
          locationId: true,
          periodStart: true,
          periodEnd: true,
          matrixJson: true,
        },
      });

      if (!analytics || !analytics.matrixJson) {
        return NextResponse.json({ error: "MATRIX_NOT_FOUND" }, { status: 404 });
      }

      const rows = toDecisionGradeMatrixRows(analytics.matrixJson);
      const filters = parseMatrixFilterState(searchParams);
      const filteredRows = applyMatrixFilterState(rows, filters);
      const cogsCoverage = summarizeCogsCoverage(
        filteredRows.map((row) => ({
          cogs: row.cogs,
          revenue: row.revenue,
        })),
      );
      const cogsReadiness = evaluateCogsReadiness(cogsCoverage);

      const exportRows = filteredRows.map((row) => ({
        dataset,
        generated_at: generatedAt,
        analytics_id: analytics.id,
        location_id: analytics.locationId,
        period_start: analytics.periodStart,
        period_end: analytics.periodEnd,
        menu_item: row.menuItem,
        category: row.category,
        action: row.action,
        action_reason: row.actionReason,
        units_sold: row.unitsSold,
        revenue: row.revenue,
        cogs: row.cogs,
        contribution_margin: row.contributionMargin,
        margin_pct: row.marginPct,
        popularity_score: row.popularityScore,
        margin_score: row.marginScore,
        has_valid_cogs: cogsIssue(row.cogs) === "none",
        cogs_issue: cogsIssue(row.cogs),
        cogs_item_coverage_ratio: cogsCoverage.itemCoverageRatio,
        cogs_revenue_coverage_ratio: cogsCoverage.revenueCoverageRatio,
        cogs_readiness: cogsReadiness.readiness,
        cogs_readiness_reasons: cogsReadiness.reasons.join("|"),
      }));

      const csv = toCsv(exportRows, [
        "dataset",
        "generated_at",
        "analytics_id",
        "location_id",
        "period_start",
        "period_end",
        "menu_item",
        "category",
        "action",
        "action_reason",
        "units_sold",
        "revenue",
        "cogs",
        "contribution_margin",
        "margin_pct",
        "popularity_score",
        "margin_score",
        "has_valid_cogs",
        "cogs_issue",
        "cogs_item_coverage_ratio",
        "cogs_revenue_coverage_ratio",
        "cogs_readiness",
        "cogs_readiness_reasons",
      ]);

      return csvResponse(`analyst-matrix-${analytics.id}.csv`, csv);
    }

    const locationId = Number(searchParams.get("locationId"));
    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const pairType = parsePairTypeFilter(searchParams.get("pairType"));
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;

    if (fromParam && Number.isNaN(from?.getTime())) {
      return NextResponse.json({ error: "INVALID_FROM_DATE" }, { status: 400 });
    }
    if (toParam && Number.isNaN(to?.getTime())) {
      return NextResponse.json({ error: "INVALID_TO_DATE" }, { status: 400 });
    }

    if (dataset === "pairs") {
      const minSampleSize = Number(searchParams.get("minSampleSize") ?? "5");
      if (!Number.isInteger(minSampleSize) || minSampleSize < 1 || minSampleSize > 1000) {
        return NextResponse.json({ error: "INVALID_MIN_SAMPLE_SIZE" }, { status: 400 });
      }

      const rows = await prisma.$queryRaw<
        Array<{
          location_id: number;
          menu_item_a_name: string;
          menu_item_b_name: string;
          pair_orders: string | number;
          pair_qty: string | number;
          support: string | number;
          confidence_a_to_b: string | number;
          confidence_b_to_a: string | number;
          lift_a_to_b: string | number;
          lift_b_to_a: string | number;
          pair_type: string;
          is_noisy: boolean;
        }>
      >`
        WITH location_base AS (
          SELECT d.location_key
          FROM warehouse.dim_location d
          WHERE d.operational_location_id = ${locationId}
        ),
        filtered AS (
          SELECT
            b.location_key,
            b.menu_item_a_key,
            b.menu_item_b_key,
            b.pair_orders,
            b.pair_qty,
            b.item_a_orders,
            b.item_b_orders,
            b.total_orders,
            b.pair_type,
            dd.full_date
          FROM marts.vw_pair_metrics_daily_base b
          INNER JOIN location_base lb ON lb.location_key = b.location_key
          INNER JOIN warehouse.dim_date dd ON dd.date_key = b.date_key
          WHERE (${from}::date IS NULL OR dd.full_date >= ${from}::date)
            AND (${to}::date IS NULL OR dd.full_date < ${to}::date)
        ),
        agg AS (
          SELECT
            location_key,
            menu_item_a_key,
            menu_item_b_key,
            pair_type,
            SUM(pair_orders)::NUMERIC(18, 6) AS pair_orders,
            SUM(pair_qty)::NUMERIC(18, 6) AS pair_qty,
            SUM(item_a_orders)::NUMERIC(18, 6) AS item_a_orders,
            SUM(item_b_orders)::NUMERIC(18, 6) AS item_b_orders,
            SUM(total_orders)::NUMERIC(18, 6) AS total_orders
          FROM filtered
          GROUP BY
            location_key,
            menu_item_a_key,
            menu_item_b_key,
            pair_type
        )
        SELECT
          ${locationId} AS location_id,
          ma.menu_name AS menu_item_a_name,
          mb.menu_name AS menu_item_b_name,
          a.pair_orders,
          a.pair_qty,
          CASE WHEN a.total_orders = 0 THEN 0 ELSE a.pair_orders / a.total_orders END AS support,
          CASE WHEN a.item_a_orders = 0 THEN 0 ELSE a.pair_orders / a.item_a_orders END AS confidence_a_to_b,
          CASE WHEN a.item_b_orders = 0 THEN 0 ELSE a.pair_orders / a.item_b_orders END AS confidence_b_to_a,
          CASE
            WHEN a.total_orders = 0 OR a.item_a_orders = 0 OR a.item_b_orders = 0 THEN 0
            ELSE (a.pair_orders / a.item_a_orders) / (a.item_b_orders / a.total_orders)
          END AS lift_a_to_b,
          CASE
            WHEN a.total_orders = 0 OR a.item_a_orders = 0 OR a.item_b_orders = 0 THEN 0
            ELSE (a.pair_orders / a.item_b_orders) / (a.item_a_orders / a.total_orders)
          END AS lift_b_to_a,
          a.pair_type,
          (a.pair_orders < ${minSampleSize}) AS is_noisy
        FROM agg a
        INNER JOIN warehouse.dim_menu_item ma ON ma.menu_item_key = a.menu_item_a_key
        INNER JOIN warehouse.dim_menu_item mb ON mb.menu_item_key = a.menu_item_b_key
        WHERE a.pair_orders >= ${minSampleSize}
          AND (${pairType}::text = 'all' OR a.pair_type = ${pairType}::text)
        ORDER BY lift_a_to_b DESC, a.pair_orders DESC
      `;

      const exportRows = rows.map((row) => ({
        dataset,
        generated_at: generatedAt,
        from_date: from,
        to_date: to,
        location_id: row.location_id,
        menu_item_a_name: row.menu_item_a_name,
        menu_item_b_name: row.menu_item_b_name,
        pair_orders: row.pair_orders,
        pair_qty: row.pair_qty,
        support: row.support,
        confidence_a_to_b: row.confidence_a_to_b,
        confidence_b_to_a: row.confidence_b_to_a,
        lift_a_to_b: row.lift_a_to_b,
        lift_b_to_a: row.lift_b_to_a,
        pair_type: row.pair_type,
        is_noisy: row.is_noisy,
      }));

      const csv = toCsv(exportRows, [
        "dataset",
        "generated_at",
        "from_date",
        "to_date",
        "location_id",
        "menu_item_a_name",
        "menu_item_b_name",
        "pair_orders",
        "pair_qty",
        "support",
        "confidence_a_to_b",
        "confidence_b_to_a",
        "lift_a_to_b",
        "lift_b_to_a",
        "pair_type",
        "is_noisy",
      ]);

      return csvResponse(`analyst-pairs-location-${locationId}.csv`, csv);
    }

    const minPairOrders = Number(searchParams.get("minPairOrders") ?? "5");
    if (!Number.isInteger(minPairOrders) || minPairOrders < 1 || minPairOrders > 10000) {
      return NextResponse.json({ error: "INVALID_MIN_PAIR_ORDERS" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<
      Array<{
        location_id: number;
        menu_item_a_name: string;
        menu_item_b_name: string;
        pair_orders: string | number;
        pair_qty: string | number;
        support: string | number;
        confidence_a_to_b: string | number;
        confidence_b_to_a: string | number;
        lift_a_to_b: string | number;
        lift_b_to_a: string | number;
        avg_margin_per_unit_a: string | number;
        avg_margin_per_unit_b: string | number;
        pair_strength_score: string | number;
        margin_score: string | number;
        base_combo_opportunity_score: string | number;
        pair_type_boost_factor: string | number;
        pair_type_boost_applied: boolean;
        combo_opportunity_score: string | number;
        first_seen_date: Date | null;
        last_seen_date: Date | null;
        confidence_level: string;
        pair_type: string;
      }>
    >`
      SELECT
        location_id,
        menu_item_a_name,
        menu_item_b_name,
        pair_orders,
        pair_qty,
        support,
        confidence_a_to_b,
        confidence_b_to_a,
        lift_a_to_b,
        lift_b_to_a,
        avg_margin_per_unit_a,
        avg_margin_per_unit_b,
        pair_strength_score,
        margin_score,
        base_combo_opportunity_score,
        pair_type_boost_factor,
        pair_type_boost_applied,
        combo_opportunity_score,
        first_seen_date,
        last_seen_date,
        confidence_level,
        pair_type
      FROM marts.vw_combo_opportunity_candidates
      WHERE location_id = ${locationId}
        AND pair_orders >= ${minPairOrders}
        AND (${from}::date IS NULL OR last_seen_date >= ${from}::date)
        AND (${to}::date IS NULL OR first_seen_date < ${to}::date)
        AND (${pairType}::text = 'all' OR pair_type = ${pairType}::text)
      ORDER BY combo_opportunity_score DESC, pair_orders DESC
    `;

    const exportRows = rows.map((row) => ({
      dataset,
      generated_at: generatedAt,
      from_date: from,
      to_date: to,
      location_id: row.location_id,
      menu_item_a_name: row.menu_item_a_name,
      menu_item_b_name: row.menu_item_b_name,
      pair_orders: row.pair_orders,
      pair_qty: row.pair_qty,
      support: row.support,
      confidence_a_to_b: row.confidence_a_to_b,
      confidence_b_to_a: row.confidence_b_to_a,
      lift_a_to_b: row.lift_a_to_b,
      lift_b_to_a: row.lift_b_to_a,
      avg_margin_per_unit_a: row.avg_margin_per_unit_a,
      avg_margin_per_unit_b: row.avg_margin_per_unit_b,
      pair_strength_score: row.pair_strength_score,
      margin_score: row.margin_score,
      base_combo_opportunity_score: row.base_combo_opportunity_score,
      pair_type_boost_factor: row.pair_type_boost_factor,
      pair_type_boost_applied: row.pair_type_boost_applied,
      combo_opportunity_score: row.combo_opportunity_score,
      first_seen_date: row.first_seen_date,
      last_seen_date: row.last_seen_date,
      confidence_level: row.confidence_level,
      pair_type: row.pair_type,
    }));

    const csv = toCsv(exportRows, [
      "dataset",
      "generated_at",
      "from_date",
      "to_date",
      "location_id",
      "menu_item_a_name",
      "menu_item_b_name",
      "pair_orders",
      "pair_qty",
      "support",
      "confidence_a_to_b",
      "confidence_b_to_a",
      "lift_a_to_b",
      "lift_b_to_a",
      "avg_margin_per_unit_a",
      "avg_margin_per_unit_b",
      "pair_strength_score",
      "margin_score",
      "base_combo_opportunity_score",
      "pair_type_boost_factor",
      "pair_type_boost_applied",
      "combo_opportunity_score",
      "first_seen_date",
      "last_seen_date",
      "confidence_level",
      "pair_type",
    ]);

    return csvResponse(`analyst-combos-location-${locationId}.csv`, csv);
  } catch (error) {
    console.error("Analyst export error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
