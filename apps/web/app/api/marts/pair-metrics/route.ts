import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { parsePairTypeFilter } from "@/lib/analytics/pair-type";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const minSampleSizeParam = searchParams.get("minSampleSize");
    const limitParam = searchParams.get("limit");
    const pairType = parsePairTypeFilter(searchParams.get("pairType"));

    if (!locationIdParam) {
      return NextResponse.json({ error: "MISSING_LOCATION_ID" }, { status: 400 });
    }

    const locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;

    if (fromParam && Number.isNaN(from?.getTime())) {
      return NextResponse.json({ error: "INVALID_FROM_DATE" }, { status: 400 });
    }

    if (toParam && Number.isNaN(to?.getTime())) {
      return NextResponse.json({ error: "INVALID_TO_DATE" }, { status: 400 });
    }

    const minSampleSize = minSampleSizeParam ? Number(minSampleSizeParam) : 5;
    if (!Number.isInteger(minSampleSize) || minSampleSize < 1 || minSampleSize > 1000) {
      return NextResponse.json({ error: "INVALID_MIN_SAMPLE_SIZE" }, { status: 400 });
    }

    const limit = limitParam ? Number(limitParam) : 200;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
      return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<
      Array<{
        location_key: string;
        menu_item_a_key: string;
        menu_item_b_key: string;
        menu_item_a_name: string;
        menu_item_b_name: string;
        pair_orders: string;
        pair_qty: string;
        item_a_orders: string;
        item_b_orders: string;
        total_orders: string;
        support: string;
        confidence_a_to_b: string;
        confidence_b_to_a: string;
        lift_a_to_b: string;
        lift_b_to_a: string;
        pair_type: string;
        min_sample_size: number;
        is_noisy: boolean;
      }>
    >`
      WITH location_base AS (
        SELECT
          d.location_key
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
        INNER JOIN location_base lb
          ON lb.location_key = b.location_key
        INNER JOIN warehouse.dim_date dd
          ON dd.date_key = b.date_key
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
        a.location_key,
        a.menu_item_a_key,
        a.menu_item_b_key,
        ma.menu_name AS menu_item_a_name,
        mb.menu_name AS menu_item_b_name,
        a.pair_orders,
        a.pair_qty,
        a.item_a_orders,
        a.item_b_orders,
        a.total_orders,
        CASE
          WHEN a.total_orders = 0 THEN 0
          ELSE a.pair_orders / a.total_orders
        END AS support,
        CASE
          WHEN a.item_a_orders = 0 THEN 0
          ELSE a.pair_orders / a.item_a_orders
        END AS confidence_a_to_b,
        CASE
          WHEN a.item_b_orders = 0 THEN 0
          ELSE a.pair_orders / a.item_b_orders
        END AS confidence_b_to_a,
        CASE
          WHEN a.total_orders = 0 OR a.item_a_orders = 0 OR a.item_b_orders = 0 THEN 0
          ELSE (a.pair_orders / a.item_a_orders) / (a.item_b_orders / a.total_orders)
        END AS lift_a_to_b,
        CASE
          WHEN a.total_orders = 0 OR a.item_a_orders = 0 OR a.item_b_orders = 0 THEN 0
          ELSE (a.pair_orders / a.item_b_orders) / (a.item_a_orders / a.total_orders)
        END AS lift_b_to_a,
        a.pair_type,
        ${minSampleSize} AS min_sample_size,
        (a.pair_orders < ${minSampleSize}) AS is_noisy
      FROM agg a
      INNER JOIN warehouse.dim_menu_item ma
        ON ma.menu_item_key = a.menu_item_a_key
      INNER JOIN warehouse.dim_menu_item mb
        ON mb.menu_item_key = a.menu_item_b_key
      WHERE (${pairType}::text = 'all' OR a.pair_type = ${pairType}::text)
      ORDER BY
        is_noisy ASC,
        lift_a_to_b DESC,
        pair_orders DESC,
        menu_item_a_name ASC,
        menu_item_b_name ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error("Load pair metrics mart error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
