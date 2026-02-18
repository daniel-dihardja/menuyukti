import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
  createDecisionApiContract,
  createDecisionContext,
} from "@/lib/contracts/decision-api-contract";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationIdParam = searchParams.get("locationId");
  const locationId = locationIdParam ? Number(locationIdParam) : null;

  if (locationIdParam && !Number.isInteger(locationId)) {
    const context = createDecisionContext({
      persona: "analyst",
      trust: { qualityStatus: "failed", reasons: ["invalid_location_id"] },
    });
    return NextResponse.json(
      {
        error: "INVALID_LOCATION_ID",
        contract: createDecisionApiContract({
          surface: "heatmap",
          context,
          readiness: "blocked",
          confidence: "blocked",
        }),
      },
      { status: 400 },
    );
  }

  if (locationId) {
    const rows = await prisma.$queryRaw<
      Array<{
        location_key: string;
        menu_category: string | null;
        daypart: string;
        is_weekend: boolean;
        qty: string | number;
        net_revenue: string | number;
        margin: string | number;
      }>
    >`
      SELECT
        location_key,
        menu_category,
        daypart,
        is_weekend,
        qty,
        net_revenue,
        margin
      FROM marts.vw_daypart_performance
      WHERE location_key = ${locationId}
      ORDER BY daypart, menu_category NULLS LAST
    `;
    const context = createDecisionContext({
      persona: "analyst",
      locationId,
      trust: { qualityStatus: "unknown", reasons: ["pipeline_metadata_not_loaded"] },
    });
    return NextResponse.json({
      items: rows,
      contract: createDecisionApiContract({
        surface: "heatmap",
        context,
        evidence: [
          {
            source: "marts",
            entity: "marts.vw_daypart_performance",
            metric: "row_count",
            value: rows.length,
            key: { locationId },
          },
        ],
      }),
    });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      location_key: string;
      menu_category: string | null;
      daypart: string;
      is_weekend: boolean;
      qty: string | number;
      net_revenue: string | number;
      margin: string | number;
    }>
  >`
    SELECT
      location_key,
      menu_category,
      daypart,
      is_weekend,
      qty,
      net_revenue,
      margin
    FROM marts.vw_daypart_performance
    ORDER BY location_key, daypart, menu_category NULLS LAST
    LIMIT 1000
  `;
  const context = createDecisionContext({
    persona: "analyst",
    trust: { qualityStatus: "unknown", reasons: ["pipeline_metadata_not_loaded"] },
  });
  return NextResponse.json({
    items: rows,
    contract: createDecisionApiContract({
      surface: "heatmap",
      context,
      evidence: [
        {
          source: "marts",
          entity: "marts.vw_daypart_performance",
          metric: "row_count",
          value: rows.length,
          key: { locationId: null },
        },
      ],
    }),
  });
}
