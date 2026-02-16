import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { parseMatrixFilterState } from "@/lib/analytics/matrix-filter-state";
import { applyMatrixFilterState } from "@/lib/analytics/matrix-filter-engine";
import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";
import { parsePairTypeFilter } from "@/lib/analytics/pair-type";
import { toCsv } from "@/lib/export/csv";

type ExportDataset = "matrix" | "pairs" | "combos";

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
  if (raw === "matrix" || raw === "pairs" || raw === "combos") return raw;
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const dataset = parseDataset(searchParams.get("dataset"));
    if (!dataset) {
      return NextResponse.json(
        { error: "INVALID_DATASET", expected: ["matrix", "pairs", "combos"] },
        { status: 400 },
      );
    }

    const generatedAt = new Date().toISOString();

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
