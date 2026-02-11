import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

type Params = {
  params: Promise<{
    analyticsId: string;
  }>;
};

export async function POST(req: Request, { params }: Params) {
  // 1️⃣ Unwrap params
  const { analyticsId: analyticsIdParam } = await params;
  const analyticsId = Number(analyticsIdParam);

  if (!Number.isInteger(analyticsId)) {
    return NextResponse.json(
      { message: "Invalid analytics id" },
      { status: 400 },
    );
  }

  // 2️⃣ Parse body
  const body = await req.json();

  if (!Array.isArray(body?.items)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // 3️⃣ Validate updates
  const updates = body.items.filter(
    (item: any) =>
      Number.isInteger(item.id) &&
      (typeof item.cogs === "number" || item.cogs === null),
  );

  if (updates.length === 0) {
    return NextResponse.json(
      { message: "No valid items to update" },
      { status: 400 },
    );
  }

  // 4️⃣ Update COGS transactionally
  await prisma.$transaction(
    updates.map((item: { id: number; cogs: number | null }) =>
      prisma.analyticsMenuItem.updateMany({
        where: {
          id: item.id,
          analyticsId,
        },
        data: {
          cogs: item.cogs,
        },
      }),
    ),
  );

  // 5️⃣ Fetch all menu items for matrix calculation
  const menuItems = await prisma.analyticsMenuItem.findMany({
    where: { analyticsId },
    select: {
      menuName: true,
      quantity: true,
      totalRevenue: true,
      cogs: true,
      menuCategory: true,
      menuCategoryDetail: true,
    },
  });

  if (menuItems.length === 0) {
    return NextResponse.json(
      { message: "No menu items found" },
      { status: 404 },
    );
  }

  const ANALYTICS_API_URL = process.env.ANALYTICS_API_URL;
  if (!ANALYTICS_API_URL) {
    return NextResponse.json(
      { message: "ANALYTICS_API_URL_NOT_CONFIGURED" },
      { status: 500 },
    );
  }

  // 6️⃣ Shape payload for analytics API
  const matrixPayload = {
    items: menuItems.map((item) => ({
      menu_name: item.menuName,
      quantity: item.quantity,
      total_revenue: Number(item.totalRevenue),
      cogs: item.cogs !== null ? Number(item.cogs) : null,
      menu_category: item.menuCategory,
      menu_category_detail: item.menuCategoryDetail,
    })),
  };

  // 7️⃣ Call analytics API
  const res = await fetch(
    `${process.env.ANALYTICS_API_URL}/menu-items/matrix`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(matrixPayload),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    return NextResponse.json(
      { message: "Matrix calculation failed", detail: error },
      { status: res.status },
    );
  }

  const matrixResult = await res.json();

  // 8️⃣ Build decision payload from matrix + heatmaps
  const analyticsRecord = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      heatmapJson: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  let insights: unknown = null;

  if (analyticsRecord?.heatmapJson) {
    const reportingPeriod =
      analyticsRecord.periodStart && analyticsRecord.periodEnd
        ? `${analyticsRecord.periodStart.toISOString().slice(0, 10)}..${analyticsRecord.periodEnd
            .toISOString()
            .slice(0, 10)}`
        : "unknown";

    const heatmapsRaw = analyticsRecord.heatmapJson as Array<{
      menu: string;
      menuCategory?: string | null;
      menuCategoryDetail?: string | null;
      dailyHeatmap?: Array<{ hour: string | number; quantity: number }>;
      weeklyHeatmap?: Array<{ day: string; quantity: number }>;
    }>;

    const heatmapsPayload = heatmapsRaw.map((item) => ({
      menu: item.menu,
      menu_category: item.menuCategory ?? null,
      menu_category_detail: item.menuCategoryDetail ?? null,
      daily_heatmap: (item.dailyHeatmap ?? []).map((h) => ({
        hour: Number(h.hour),
        quantity: h.quantity,
      })),
      weekly_heatmap: (item.weeklyHeatmap ?? []).map((w) => ({
        day: w.day,
        quantity: w.quantity,
      })),
      reporting_period: reportingPeriod,
    }));

    const distributionPayload = {
      categories: (matrixResult.matrix.distribution ?? []).map(
        (item: {
          category: string;
          count: number;
          percentage: number;
          margin_contribution_percentage: number;
        }) => ({
          category: item.category,
          item_count: item.count,
          item_share: item.percentage,
          margin_share: item.margin_contribution_percentage,
        }),
      ),
    };

    const decisionPayload = {
      matrix_items: matrixResult.matrix.items ?? [],
      heatmaps: heatmapsPayload,
      distribution: distributionPayload,
    };

    try {
      const decisionRes = await fetch(
        `${ANALYTICS_API_URL}/decision/pipeline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(decisionPayload),
        },
      );

      if (decisionRes.ok) {
        const decisionJson = await decisionRes.json();
        insights = decisionJson.insights ?? null;
      } else {
        console.error(
          "Decision pipeline error:",
          await decisionRes.text(),
        );
      }
    } catch (error) {
      console.error("Decision pipeline request failed:", error);
    }
  }

  // 9️⃣ Persist matrix snapshot on Analytics
  await prisma.analytics.update({
    where: { id: analyticsId },
    data: {
      matrixJson: matrixResult.matrix,
      // optional future extensions:
      matrixDistributionJson: matrixResult.matrix.distribution,
      totalCogs: matrixResult.matrix.thresholds.total_cogs,
      // totalMargin: matrixResult.matrix.thresholds.total_margin,
      totalProfit: matrixResult.matrix.thresholds.total_profit,
      insightsJson: insights ? insights : Prisma.JsonNull,
      // avgContributionMargin:
      // matrixResult.matrix.thresholds.avg_contribution_margin,
      // avgPopularity: matrixResult.matrix.thresholds.avg_popularity,
    },
  });

  // Return updated matrix
  return NextResponse.json({
    success: true,
    matrix: matrixResult.matrix,
    insights,
  });
}

export async function GET(_req: Request, { params }: Params) {
  const { analyticsId: analyticsIdParam } = await params;
  const analyticsId = Number(analyticsIdParam);

  if (!Number.isInteger(analyticsId)) {
    return NextResponse.json(
      { message: "Invalid analytics id" },
      { status: 400 },
    );
  }

  const menuItems = await prisma.analyticsMenuItem.findMany({
    where: { analyticsId },
    select: {
      menuName: true,
      cogs: true,
    },
  });

  return NextResponse.json({
    analyticsId,
    items: menuItems.map((item) => ({
      menuName: item.menuName,
      cogs: item.cogs !== null ? Number(item.cogs) : null,
    })),
  });
}
