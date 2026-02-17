import { NextRequest, NextResponse } from "next/server";

import { buildWeeklyInstagramSuggestions } from "@/lib/analytics/instagram-weekly-suggestions";
import { prisma } from "@/lib/prisma/client";

function parseAnalyticsId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseWeekStart(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

export async function GET(request: NextRequest) {
  const analyticsId = parseAnalyticsId(request.nextUrl.searchParams.get("analyticsId"));
  if (!analyticsId) {
    return NextResponse.json({ error: "INVALID_ANALYTICS_ID" }, { status: 400 });
  }

  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      id: true,
      locationId: true,
      periodEnd: true,
      matrixJson: true,
      heatmapJson: true,
    },
  });

  if (!analytics) {
    return NextResponse.json({ error: "ANALYTICS_NOT_FOUND" }, { status: 404 });
  }

  const fallbackWeekStart = analytics.periodEnd ?? new Date();
  const weekStartDate = parseWeekStart(request.nextUrl.searchParams.get("weekStart"), fallbackWeekStart);

  const suggestions = buildWeeklyInstagramSuggestions({
    heatmapJson: analytics.heatmapJson,
    matrixJson: analytics.matrixJson,
    weekStartDate,
  });

  return NextResponse.json({
    analyticsId: analytics.id,
    locationId: analytics.locationId,
    weekStartDate: weekStartDate.toISOString().slice(0, 10),
    suggestions,
  });
}
