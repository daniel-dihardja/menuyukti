import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationIdParam = searchParams.get("locationId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");

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

    const limit = limitParam ? Number(limitParam) : 200;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
      return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<
      Array<{
        instagram_post_id: number;
        campaign_id: number | null;
        location_id: number;
        published_at: Date;
        canonical_menu_name: string;
        pre_qty: string | number;
        post_qty: string | number;
        delta_qty: string | number;
        pre_revenue: string | number;
        post_revenue: string | number;
        delta_revenue: string | number;
        pre_margin: string | number;
        post_margin: string | number;
        delta_margin: string | number;
        pre_active_days: number;
        post_active_days: number;
        confidence_level: string;
        attribution_window_days: number;
      }>
    >`
      SELECT
        instagram_post_id,
        campaign_id,
        location_id,
        published_at,
        canonical_menu_name,
        pre_qty,
        post_qty,
        delta_qty,
        pre_revenue,
        post_revenue,
        delta_revenue,
        pre_margin,
        post_margin,
        delta_margin,
        pre_active_days,
        post_active_days,
        confidence_level,
        attribution_window_days
      FROM marts.vw_instagram_item_attribution_pre_post
      WHERE location_id = ${locationId}
        AND (${from}::timestamptz IS NULL OR published_at >= ${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR published_at < ${to}::timestamptz)
      ORDER BY published_at DESC, instagram_post_id DESC, canonical_menu_name ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error("Load instagram attribution mart error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
