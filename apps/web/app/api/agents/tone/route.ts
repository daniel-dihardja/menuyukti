import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

type InvokeTonePayload = {
  analyticsId?: number;
  forceRerun?: boolean;
};

function toNumber(value: unknown): number {
  return typeof value === "number" ? Number(value) : Number(value ?? 0);
}

function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function normalizeHeatmaps(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => {
    const h = item as Record<string, unknown>;

    return {
      menu: h.menu ?? "",
      menu_category: h.menu_category ?? h.menuCategory ?? null,
      menu_category_detail:
        h.menu_category_detail ?? h.menuCategoryDetail ?? null,
      daily_heatmap: Array.isArray(h.daily_heatmap)
        ? h.daily_heatmap
        : Array.isArray(h.dailyHeatmap)
          ? h.dailyHeatmap
          : [],
      weekly_heatmap: Array.isArray(h.weekly_heatmap)
        ? h.weekly_heatmap
        : Array.isArray(h.weeklyHeatmap)
          ? h.weeklyHeatmap
          : [],
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analyticsId = Number(searchParams.get("analyticsId"));

    if (!Number.isInteger(analyticsId)) {
      return NextResponse.json(
        { error: "INVALID_ANALYTICS_ID" },
        { status: 400 },
      );
    }

    const analytics = await prisma.analytics.findUnique({
      where: { id: analyticsId },
      select: { branchId: true },
    });

    if (!analytics) {
      return NextResponse.json(
        { error: "ANALYTICS_NOT_FOUND" },
        { status: 404 },
      );
    }

    const cached = await prisma.agentOutput.findUnique({
      where: {
        agentId_branchId_analyticsId: {
          agentId: "tone",
          branchId: analytics.branchId,
          analyticsId,
        },
      },
      select: { outputs: true },
    });

    return NextResponse.json({ outputs: cached?.outputs ?? null });
  } catch (error) {
    console.error("Tone agent output lookup failed:", error);
    return NextResponse.json(
      { error: "TONE_AGENT_LOOKUP_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const AGENTS_API_URL = process.env.AGENTS_API_URL;
    if (!AGENTS_API_URL) {
      return NextResponse.json(
        { error: "AGENTS_API_URL_NOT_CONFIGURED" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as InvokeTonePayload;
    const analyticsId = Number(body?.analyticsId);
    const forceRerun = body?.forceRerun === true;

    if (!Number.isInteger(analyticsId)) {
      return NextResponse.json(
        { error: "INVALID_ANALYTICS_ID" },
        { status: 400 },
      );
    }

    const analytics = await prisma.analytics.findUnique({
      where: { id: analyticsId },
      include: {
        menuItems: {
          select: {
            menuName: true,
            menuCategory: true,
            menuCategoryDetail: true,
            quantity: true,
            totalRevenue: true,
            cogs: true,
          },
        },
      },
    });

    if (!analytics) {
      return NextResponse.json(
        { error: "ANALYTICS_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (forceRerun) {
      await prisma.agentOutput.deleteMany({
        where: {
          agentId: "tone",
          branchId: analytics.branchId,
          analyticsId,
        },
      });
    } else {
      const cached = await prisma.agentOutput.findUnique({
        where: {
          agentId_branchId_analyticsId: {
            agentId: "tone",
            branchId: analytics.branchId,
            analyticsId,
          },
        },
        select: { outputs: true },
      });

      if (cached?.outputs) {
        return NextResponse.json({ outputs: cached.outputs });
      }
    }

    const matrixFromSnapshot =
      (
        analytics.matrixJson as {
          items?: Array<Record<string, unknown>>;
        } | null
      )?.items ?? [];

    const matrixItemsFromMenuItems = analytics.menuItems.map((item) => ({
      menu: item.menuName,
      menu_category: item.menuCategory,
      menu_category_detail: item.menuCategoryDetail,
      quantity: item.quantity,
      total_revenue: Number(item.totalRevenue),
      cogs: item.cogs !== null ? Number(item.cogs) : 0,
    }));

    const matrixItems =
      matrixItemsFromMenuItems.length > 0
        ? matrixItemsFromMenuItems
        : matrixFromSnapshot;

    const coreInput = {
      matrix_items: matrixItems,
      heatmaps: normalizeHeatmaps(analytics.heatmapJson),
      distribution: analytics.matrixDistributionJson ?? {},
      sales_summary: {
        total_orders: analytics.totalOrders ?? 0,
        total_items_sold: analytics.totalItemsSold ?? 0,
        total_revenue: toNumber(analytics.totalRevenue),
        avg_order_revenue: toNumber(analytics.avgOrderRevenue),
        max_order_revenue: toNumber(analytics.maxOrderRevenue),
        min_order_revenue: toNumber(analytics.minOrderRevenue),
        avg_order_items: toNumber(analytics.avgOrderItems),
        max_order_items: analytics.maxOrderItems ?? 0,
        min_order_items: analytics.minOrderItems ?? 0,
        avg_popularity: toNumber(analytics.avgPopularity),
        popularity_index: Array.isArray(analytics.popularityJson)
          ? analytics.popularityJson
          : [],
        period_start: toDateOnly(analytics.periodStart),
        period_end: toDateOnly(analytics.periodEnd),
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    let invokeResponse: Response;

    try {
      invokeResponse = await fetch(`${AGENTS_API_URL}/tone/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ core_input: coreInput }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "AGENTS_SERVICE_TIMEOUT" },
          { status: 504 },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!invokeResponse.ok) {
      return NextResponse.json(
        { error: "AGENTS_SERVICE_FAILED" },
        { status: 502 },
      );
    }

    const result = await invokeResponse.json();

    if (result?.outputs) {
      await prisma.agentOutput.upsert({
        where: {
          agentId_branchId_analyticsId: {
            agentId: "tone",
            branchId: analytics.branchId,
            analyticsId,
          },
        },
        update: { outputs: result.outputs },
        create: {
          agentId: "tone",
          branchId: analytics.branchId,
          analyticsId,
          outputs: result.outputs,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tone agent invocation failed:", error);
    return NextResponse.json(
      { error: "TONE_AGENT_INVOKE_FAILED" },
      { status: 500 },
    );
  }
}
