import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { AnalyticsResponse } from "../types";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const branchId = formData.get("branchId");

    if (!branchId || typeof branchId !== "string") {
      return NextResponse.json(
        { error: "BRANCH_ID_REQUIRED" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "NO_FILE_UPLOADED" }, { status: 400 });
    }

    // --------------------------------------------------
    // Forward file to analytics service
    // --------------------------------------------------
    const forwardFormData = new FormData();
    forwardFormData.append("file", file, file.name);
    forwardFormData.append("branch_id", branchId);

    const apiResponse = await fetch("http://localhost:8000/analyse", {
      method: "POST",
      body: forwardFormData,
    });

    if (!apiResponse.ok) {
      const text = await apiResponse.text();
      throw new Error(`ANALYTICS_API_ERROR: ${text}`);
    }

    const apiResult: AnalyticsResponse = await apiResponse.json();
    const analytics = apiResult.analytics;

    // --------------------------------------------------
    // Persist analytics snapshot (transactional)
    // --------------------------------------------------
    await prisma.$transaction(async (tx) => {
      const analyticsRecord = await tx.analytics.create({
        data: {
          branchId: Number(branchId),

          // Source metadata
          sourceFile: file.name,

          // Period
          periodStart: analytics.period_start
            ? new Date(analytics.period_start)
            : null,
          periodEnd: analytics.period_end
            ? new Date(analytics.period_end)
            : null,

          // Global KPIs
          totalOrders: analytics.total_orders,
          totalItemsSold: analytics.total_items_sold,
          totalRevenue: analytics.total_revenue,
          avgOrderRevenue: analytics.avg_order_revenue,
          avgOrderItems: analytics.avg_order_items,

          // Thresholds
          avgPopularity: analytics.avg_popularity,

          // Other KPIs
          maxOrderItems: analytics.max_order_items,
          minOrderItems: analytics.min_order_items,
          maxOrderRevenue: analytics.max_order_revenue,
          minOrderRevenue: analytics.min_order_revenue,

          // Derived analytics results
          popularityJson: analytics.popularity_index ?? Prisma.JsonNull,
          heatmapJson: analytics.menu_heatmaps ?? Prisma.JsonNull,
        },
      });

      if (apiResult.menu_items.length > 0) {
        await tx.analyticsMenuItem.createMany({
          data: apiResult.menu_items.map((item) => ({
            analyticsId: analyticsRecord.id,
            menuName: item.menu,
            quantity: item.quantity,
            totalRevenue: item.total_revenue,
          })),
        });
      }
    });

    return NextResponse.json(apiResult);
  } catch (error: unknown) {
    console.error("Upload error:", error);

    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
