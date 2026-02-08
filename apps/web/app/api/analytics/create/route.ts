import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { AnalyticsResponse } from "../types";

export const runtime = "nodejs";

// Optional normalization helper (recommended)
const normalizeMenuName = (name: string) => name.trim().toLowerCase();

export async function POST(request: Request) {
  try {
    const ANALYTICS_API_URL = process.env.ANALYTICS_API_URL;
    if (!ANALYTICS_API_URL) {
      return NextResponse.json(
        { error: "ANALYTICS_API_URL_NOT_CONFIGURED" },
        { status: 500 },
      );
    }
    // --------------------------------------------------
    // Parse & validate input
    // --------------------------------------------------
    const formData = await request.formData();

    const file = formData.get("file");
    const branchIdRaw = formData.get("branchId");

    if (!branchIdRaw || typeof branchIdRaw !== "string") {
      return NextResponse.json(
        { error: "BRANCH_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const branchId = Number(branchIdRaw);

    if (!Number.isInteger(branchId)) {
      return NextResponse.json({ error: "INVALID_BRANCH_ID" }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "NO_FILE_UPLOADED" }, { status: 400 });
    }

    // --------------------------------------------------
    // Validate branch existence (fail early)
    // --------------------------------------------------
    const branchExists = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });

    if (!branchExists) {
      return NextResponse.json({ error: "BRANCH_NOT_FOUND" }, { status: 404 });
    }

    // --------------------------------------------------
    // Forward file to analytics service (with timeout)
    // --------------------------------------------------
    const forwardFormData = new FormData();
    forwardFormData.append("file", file, file.name);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let apiResponse: Response;

    try {
      apiResponse = await fetch(`${ANALYTICS_API_URL}/analyse`, {
        method: "POST",
        body: forwardFormData,
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "ANALYTICS_SERVICE_TIMEOUT" },
          { status: 504 },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!apiResponse.ok) {
      console.error("Analytics API error:", await apiResponse.text());

      return NextResponse.json(
        { error: "ANALYTICS_SERVICE_FAILED" },
        { status: 502 },
      );
    }

    const apiResult: AnalyticsResponse = await apiResponse.json();
    const analytics = apiResult.analytics;

    // --------------------------------------------------
    // Persist analytics snapshot (transactional)
    // --------------------------------------------------
    await prisma.$transaction(async (tx) => {
      // ----------------------------------------------
      // Create analytics snapshot
      // ----------------------------------------------
      const analyticsRecord = await tx.analytics.create({
        data: {
          branchId,

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

          // Derived analytics
          popularityJson: analytics.popularity_index ?? Prisma.JsonNull,
          heatmapJson: analytics.menu_heatmaps ?? Prisma.JsonNull,
        },
      });

      // ----------------------------------------------
      // Load previous analytics menu item COGS
      // ----------------------------------------------
      const previousAnalytics = await tx.analytics.findFirst({
        where: {
          branchId,
          id: { not: analyticsRecord.id },
        },
        orderBy: {
          uploadedAt: "desc",
        },
        select: {
          menuItems: {
            select: {
              menuName: true,
              cogs: true,
            },
          },
        },
      });

      const previousCogsMap = new Map<string, number>();

      if (previousAnalytics) {
        for (const item of previousAnalytics.menuItems) {
          if (item.cogs !== null) {
            previousCogsMap.set(
              normalizeMenuName(item.menuName),
              Number(item.cogs),
            );
          }
        }
      }

      // ----------------------------------------------
      // Insert new menu items with inherited COGS
      // ----------------------------------------------
      if (apiResult.menu_items.length > 0) {
        await tx.analyticsMenuItem.createMany({
          data: apiResult.menu_items.map((item) => ({
            analyticsId: analyticsRecord.id,
            menuName: item.menu,
            menuCategory: item.menu_category,
            menuCategoryDetail: item.menu_category_detail,
            quantity: item.quantity,
            totalRevenue: item.total_revenue,

            // 👇 inherit COGS if available
            cogs: previousCogsMap.get(normalizeMenuName(item.menu)) ?? null,
          })),
        });
      }
    });

    // --------------------------------------------------
    // Success
    // --------------------------------------------------
    return NextResponse.json(apiResult);
  } catch (error: unknown) {
    console.error("Upload error:", error);

    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 400 });
  }
}
