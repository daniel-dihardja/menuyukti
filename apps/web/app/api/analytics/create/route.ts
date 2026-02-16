import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { AnalyticsResponse } from "../types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Optional normalization helper (recommended)
const normalizeMenuName = (name: string) => name.trim().toLowerCase();
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const locationIdRaw = formData.get("locationId");

    if (!locationIdRaw || typeof locationIdRaw !== "string") {
      return NextResponse.json(
        { error: "BRANCH_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const locationId = Number(locationIdRaw);

    if (!Number.isInteger(locationId)) {
      return NextResponse.json({ error: "INVALID_BRANCH_ID" }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "NO_FILE_UPLOADED" }, { status: 400 });
    }

    // --------------------------------------------------
    // Validate branch existence (fail early)
    // --------------------------------------------------
    const branchExists = await prisma.location.findUnique({
      where: { id: locationId },
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
    const metadata = apiResult.metadata;
    const pipelineRunId =
      metadata?.pipeline_run_id && UUID_V4_RE.test(metadata.pipeline_run_id)
        ? metadata.pipeline_run_id
        : randomUUID();
    const schemaVersion = metadata?.schema_version ?? "v1";
    const sourceSystem = metadata?.source_system ?? "unknown";
    const qualityStatus = metadata?.quality_status ?? "warning";
    const ingestedAt = metadata?.ingested_at_utc
      ? new Date(metadata.ingested_at_utc)
      : new Date();
    const ingestedAtUtc = Number.isNaN(ingestedAt.getTime())
      ? new Date()
      : ingestedAt;

    // --------------------------------------------------
    // Persist analytics snapshot (transactional)
    // --------------------------------------------------
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO warehouse.dim_pipeline_run
          (pipeline_run_id, schema_version, source_system, source_file, ingested_at_utc, quality_status)
        VALUES
          (
            CAST(${pipelineRunId} AS UUID),
            ${schemaVersion},
            ${sourceSystem},
            ${file.name},
            ${ingestedAtUtc},
            ${qualityStatus}
          )
        ON CONFLICT (pipeline_run_id) DO NOTHING
      `;

      // ----------------------------------------------
      // Create analytics snapshot
      // ----------------------------------------------
      const analyticsRecord = await tx.analytics.create({
        data: {
          locationId: locationId,

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
          locationId: locationId,
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

            // inherit COGS if available
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
