import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");
    const minPairOrdersParam = searchParams.get("minPairOrders");
    const limitParam = searchParams.get("limit");

    if (!locationIdParam) {
      return NextResponse.json({ error: "MISSING_LOCATION_ID" }, { status: 400 });
    }

    const locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
    }

    const minPairOrders = minPairOrdersParam ? Number(minPairOrdersParam) : 5;
    if (!Number.isInteger(minPairOrders) || minPairOrders < 1 || minPairOrders > 10000) {
      return NextResponse.json({ error: "INVALID_MIN_PAIR_ORDERS" }, { status: 400 });
    }

    const limit = limitParam ? Number(limitParam) : 100;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
      return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<
      Array<{
        location_id: number;
        menu_item_a_key: string;
        menu_item_b_key: string;
        menu_item_a_name: string;
        menu_item_b_name: string;
        pair_orders: string;
        pair_qty: string;
        support: string;
        confidence_a_to_b: string;
        confidence_b_to_a: string;
        lift_a_to_b: string;
        lift_b_to_a: string;
        avg_margin_per_unit_a: string;
        avg_margin_per_unit_b: string;
        pair_strength_score: string;
        margin_score: string;
        combo_opportunity_score: string;
        first_seen_date: Date;
        last_seen_date: Date;
        confidence_level: string;
        is_noisy: boolean;
      }>
    >`
      SELECT
        location_id,
        menu_item_a_key,
        menu_item_b_key,
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
        combo_opportunity_score,
        first_seen_date,
        last_seen_date,
        confidence_level,
        (pair_orders < ${minPairOrders}) AS is_noisy
      FROM marts.vw_combo_opportunity_candidates
      WHERE location_id = ${locationId}
        AND pair_orders >= ${minPairOrders}
      ORDER BY combo_opportunity_score DESC, pair_orders DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error("Load combo opportunities error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
