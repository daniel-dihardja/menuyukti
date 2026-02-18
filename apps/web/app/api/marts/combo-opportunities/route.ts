import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { parsePairTypeFilter } from "@/lib/analytics/pair-type";
import {
  createDecisionApiContract,
  createDecisionContext,
} from "@/lib/contracts/decision-api-contract";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");
    const minPairOrdersParam = searchParams.get("minPairOrders");
    const limitParam = searchParams.get("limit");
    const pairType = parsePairTypeFilter(searchParams.get("pairType"));

    if (!locationIdParam) {
      const context = createDecisionContext({
        persona: "analyst",
        trust: { qualityStatus: "failed", reasons: ["missing_location_id"] },
      });
      return NextResponse.json(
        {
          error: "MISSING_LOCATION_ID",
          contract: createDecisionApiContract({
            surface: "pairs",
            context,
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId)) {
      const context = createDecisionContext({
        persona: "analyst",
        trust: { qualityStatus: "failed", reasons: ["invalid_location_id"] },
      });
      return NextResponse.json(
        {
          error: "INVALID_LOCATION_ID",
          contract: createDecisionApiContract({
            surface: "pairs",
            context,
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const minPairOrders = minPairOrdersParam ? Number(minPairOrdersParam) : 5;
    if (!Number.isInteger(minPairOrders) || minPairOrders < 1 || minPairOrders > 10000) {
      const context = createDecisionContext({
        persona: "analyst",
        locationId,
        trust: { qualityStatus: "failed", reasons: ["invalid_min_pair_orders"] },
      });
      return NextResponse.json(
        {
          error: "INVALID_MIN_PAIR_ORDERS",
          contract: createDecisionApiContract({
            surface: "pairs",
            context,
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
    }

    const limit = limitParam ? Number(limitParam) : 100;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
      const context = createDecisionContext({
        persona: "analyst",
        locationId,
        trust: { qualityStatus: "failed", reasons: ["invalid_limit"] },
      });
      return NextResponse.json(
        {
          error: "INVALID_LIMIT",
          contract: createDecisionApiContract({
            surface: "pairs",
            context,
            readiness: "blocked",
            confidence: "blocked",
          }),
        },
        { status: 400 },
      );
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
        base_combo_opportunity_score: string;
        pair_type_boost_factor: string;
        pair_type_boost_applied: boolean;
        combo_opportunity_score: string;
        first_seen_date: Date;
        last_seen_date: Date;
        confidence_level: string;
        pair_type: string;
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
        base_combo_opportunity_score,
        pair_type_boost_factor,
        pair_type_boost_applied,
        combo_opportunity_score,
        first_seen_date,
        last_seen_date,
        confidence_level,
        pair_type,
        (pair_orders < ${minPairOrders}) AS is_noisy
      FROM marts.vw_combo_opportunity_candidates
      WHERE location_id = ${locationId}
        AND pair_orders >= ${minPairOrders}
        AND (${pairType}::text = 'all' OR pair_type = ${pairType}::text)
      ORDER BY combo_opportunity_score DESC, pair_orders DESC
      LIMIT ${limit}
    `;

    const context = createDecisionContext({
      persona: "analyst",
      locationId,
      filterState: {
        minPairOrders,
        limit,
        pairType,
      },
      trust: { qualityStatus: "unknown", reasons: ["pipeline_metadata_not_loaded"] },
    });
    return NextResponse.json({
      items: rows,
      contract: createDecisionApiContract({
        surface: "pairs",
        context,
        evidence: [
          {
            source: "marts",
            entity: "marts.vw_combo_opportunity_candidates",
            metric: "row_count",
            value: rows.length,
            key: { locationId, pairType, minPairOrders, limit },
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Load combo opportunities error:", error);
    const context = createDecisionContext({
      persona: "analyst",
      trust: { qualityStatus: "failed", reasons: ["internal_server_error"] },
    });
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        contract: createDecisionApiContract({
          surface: "pairs",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 500 },
    );
  }
}
