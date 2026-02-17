import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json(
        { error: "BRANCH_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const locationIdNumber = Number(locationId);

    const analytics = await prisma.analytics.findMany({
      where: {
        locationId: locationIdNumber,
      },
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        sourceFile: true,
        uploadedAt: true,
      },
    });

    const analyticsIds = analytics.map((item) => item.id);
    const cogsCoverageByAnalyticsId = new Map<number, number>();

    if (analyticsIds.length > 0) {
      const cogsCoverageRows = await prisma.analyticsMenuItem.groupBy({
        by: ["analyticsId"],
        where: {
          analyticsId: { in: analyticsIds },
          cogs: { not: null },
        },
        _count: {
          _all: true,
        },
      });

      for (const row of cogsCoverageRows) {
        cogsCoverageByAnalyticsId.set(row.analyticsId, row._count._all);
      }
    }

    const [publishedPostsCount, mappedPromotedItemsCount] = await Promise.all([
      prisma.instagramPost.count({
        where: {
          locationId: locationIdNumber,
          publishedAt: {
            not: null,
          },
        },
      }),
      prisma.instagramPostPromotedItem.count({
        where: {
          locationId: locationIdNumber,
        },
      }),
    ]);

    const hasAttributionData =
      publishedPostsCount > 0 && mappedPromotedItemsCount > 0;

    const result = analytics.map((a) => ({
      id: a.id,
      name: a.sourceFile ?? "Unknown file",
      uploadedAt: a.uploadedAt.toISOString(),
      readinessSignals: {
        hasCoreData: true,
        hasCogsData: (cogsCoverageByAnalyticsId.get(a.id) ?? 0) > 0,
        hasAttributionData,
        hasDegradedDependency: false,
        hasBlockedDependency: false,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch analytics error:", error);
    return NextResponse.json(
      { error: "FETCH_ANALYTICS_FAILED" },
      { status: 500 },
    );
  }
}
