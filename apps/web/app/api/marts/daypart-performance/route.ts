import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationIdParam = searchParams.get("locationId");
  const locationId = locationIdParam ? Number(locationIdParam) : null;

  if (locationIdParam && !Number.isInteger(locationId)) {
    return NextResponse.json({ error: "INVALID_LOCATION_ID" }, { status: 400 });
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
    return NextResponse.json({ items: rows });
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
  return NextResponse.json({ items: rows });
}
