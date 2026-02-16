import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

const reasonByCategory: Record<string, string> = {
  star: "high_popularity_high_margin",
  plow_horse: "high_popularity_low_margin",
  puzzle: "low_popularity_high_margin",
  low_end: "low_popularity_low_margin",
};

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
  const thresholds = matrixResult.matrix?.thresholds ?? {};
  const enrichedMatrixItems = Array.isArray(matrixResult.matrix?.items)
    ? matrixResult.matrix.items.map((item: any) => {
        const popularityScore =
          typeof item.popularity_index === "number"
            ? item.popularity_index
            : typeof item.popularity === "number"
              ? item.popularity
              : null;
        const marginScore =
          typeof item.contribution_margin_percentage === "number"
            ? item.contribution_margin_percentage
            : typeof item.margin_percentage === "number"
              ? item.margin_percentage
              : null;
        const reasonCode =
          reasonByCategory[String(item.category)] ?? "unclassified";

        return {
          ...item,
          popularity_score: popularityScore,
          margin_score: marginScore,
          thresholds_used: {
            avg_popularity:
              thresholds.avg_popularity ?? thresholds.avg_popularity_threshold ?? null,
            avg_contribution_margin:
              thresholds.avg_contribution_margin ??
              thresholds.avg_contribution_margin_percentage ??
              null,
          },
          reason_code: reasonCode,
        };
      })
    : [];
  const enrichedMatrix = {
    ...matrixResult.matrix,
    items: enrichedMatrixItems,
  };

  // 8️⃣ Persist matrix snapshot on Analytics
  await prisma.analytics.update({
    where: { id: analyticsId },
    data: {
      matrixJson: enrichedMatrix,
      // optional future extensions:
      matrixDistributionJson: enrichedMatrix.distribution,
      totalCogs: matrixResult.matrix.thresholds.total_cogs,
      // totalMargin: matrixResult.matrix.thresholds.total_margin,
      totalProfit: matrixResult.matrix.thresholds.total_profit,
      // avgContributionMargin:
      // matrixResult.matrix.thresholds.avg_contribution_margin,
      // avgPopularity: matrixResult.matrix.thresholds.avg_popularity,
    },
  });

  // Return updated matrix
  return NextResponse.json({
    success: true,
    matrix: enrichedMatrix,
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
