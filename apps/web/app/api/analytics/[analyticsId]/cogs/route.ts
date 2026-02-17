import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createLineageForEtlJob } from "@/lib/etl/pipeline-lineage";
import { markStageJobRunning, markStageJobTerminal } from "@/lib/etl/stage-runner";
import {
  buildCogsStageIdempotencyKey,
  buildCogsVersionHash,
} from "@/lib/etl/stage-idempotency";

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

  const analyticsContext = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      id: true,
      locationId: true,
    },
  });

  if (!analyticsContext) {
    return NextResponse.json(
      { message: "Analytics not found" },
      { status: 404 },
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
  ) as Array<{ id: number; cogs: number | null }>;

  if (updates.length === 0) {
    return NextResponse.json(
      { message: "No valid items to update" },
      { status: 400 },
    );
  }

  const normalizedUpdates = updates.map((item) => ({
    id: Number(item.id),
    cogs: item.cogs == null ? null : Number(item.cogs),
  }));
  const cogsVersionHash = buildCogsVersionHash(normalizedUpdates);

  const latestSucceededEtlJob = await prisma.etlJob.findFirst({
    where: {
      analyticsId,
      status: "succeeded",
      pipelineRunId: { not: null },
    },
    orderBy: {
      finishedAt: "desc",
    },
    select: {
      pipelineRunId: true,
    },
  });

  const cogsStageIdempotencyKey = buildCogsStageIdempotencyKey({
    analyticsId,
    pipelineRunId: latestSucceededEtlJob?.pipelineRunId ?? null,
    cogsVersionHash,
  });

  const existingCogsStageJob = await prisma.etlJob.findFirst({
    where: {
      idempotencyKey: cogsStageIdempotencyKey,
      sourceFile: { startsWith: "cogs_enrichment:" },
      status: { in: ["queued", "running", "succeeded"] },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingCogsStageJob) {
    const analytics = await prisma.analytics.findUnique({
      where: { id: analyticsId },
      select: { matrixJson: true },
    });
    return NextResponse.json({
      success: true,
      deduped: true,
      idempotencyKey: cogsStageIdempotencyKey,
      jobId: existingCogsStageJob.id,
      jobStatus: existingCogsStageJob.status,
      matrix: analytics?.matrixJson ?? null,
    });
  }

  const cogsStageJob = await prisma.$transaction(async (tx) => {
    const created = await tx.etlJob.create({
      data: {
        locationId: analyticsContext.locationId,
        analyticsId,
        sourceFile: `cogs_enrichment:analyticsId=${analyticsId}|cogsVersionHash=${cogsVersionHash}`.slice(
          0,
          255,
        ),
        idempotencyKey: cogsStageIdempotencyKey,
        status: "queued",
      },
      select: { id: true },
    });

    await createLineageForEtlJob(tx, {
      etlJobId: created.id,
      locationId: analyticsContext.locationId,
      analyticsId,
      pipelineRunId: latestSucceededEtlJob?.pipelineRunId ?? null,
      trigger: "cogs_saved",
      source: "cogs",
      actor: "api:cogs_update",
      stage: "cogs_enrichment",
      inputRef: {
        analyticsId,
        cogsVersionHash,
        updatesCount: normalizedUpdates.length,
      },
    });

    return created;
  });

  await markStageJobRunning(cogsStageJob.id, "cogs_enrichment");

  try {
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

    let warehouseBackfill = {
      pipelineRunId: null as string | null,
      updatedOrderRows: 0,
      aggregatedDailyRows: 0,
    };

    if (latestSucceededEtlJob?.pipelineRunId) {
      const pipelineRunId = latestSucceededEtlJob.pipelineRunId;

      await prisma.$transaction(async (tx) => {
        const updateRows = await tx.$queryRaw<Array<{ updated_rows: bigint | number }>>`
        WITH location_base AS (
          SELECT location_key
          FROM warehouse.dim_location
          WHERE operational_location_id = ${analyticsContext.locationId}
          LIMIT 1
        ),
        menu_cogs AS (
          SELECT
            dmi.menu_item_key,
            ami.cogs::NUMERIC(14, 4) AS cogs_per_unit
          FROM public.analytics_menu_items ami
          CROSS JOIN location_base lb
          LEFT JOIN public.menu_alias ma
            ON ma.branch_id = ${analyticsContext.locationId}
           AND ma.alias_name_norm = lower(trim(ami.menu_name))
          INNER JOIN warehouse.dim_menu_item dmi
            ON dmi.location_key = lb.location_key
           AND dmi.menu_name_norm = COALESCE(ma.canonical_menu_name_norm, lower(trim(ami.menu_name)))
           AND dmi.is_current = TRUE
          WHERE ami.analytics_id = ${analyticsId}
            AND ami.cogs IS NOT NULL
        ),
        menu_cogs_dedup AS (
          SELECT
            menu_item_key,
            MAX(cogs_per_unit) AS cogs_per_unit
          FROM menu_cogs
          GROUP BY menu_item_key
        ),
        updated AS (
          UPDATE warehouse.fact_order_item foi
             SET cogs = ROUND((mcd.cogs_per_unit * foi.qty)::NUMERIC, 4),
                 margin = ROUND((foi.net_revenue - (mcd.cogs_per_unit * foi.qty))::NUMERIC, 4)
            FROM menu_cogs_dedup mcd
            CROSS JOIN location_base lb
           WHERE foi.pipeline_run_id = CAST(${pipelineRunId} AS UUID)
             AND foi.location_key = lb.location_key
             AND foi.menu_item_key = mcd.menu_item_key
          RETURNING 1
        )
        SELECT COUNT(*)::BIGINT AS updated_rows
        FROM updated
      `;

        const dailyRows = await tx.$queryRaw<Array<{ aggregated_rows: bigint | number }>>`
        WITH location_base AS (
          SELECT location_key
          FROM warehouse.dim_location
          WHERE operational_location_id = ${analyticsContext.locationId}
          LIMIT 1
        ),
        upserted AS (
          INSERT INTO warehouse.fact_menu_daily
            (
              pipeline_run_id,
              date_key,
              location_key,
              menu_item_key,
              qty,
              net_revenue,
              cogs,
              margin
            )
          SELECT
            foi.pipeline_run_id,
            foi.date_key,
            foi.location_key,
            foi.menu_item_key,
            SUM(foi.qty) AS qty,
            SUM(foi.net_revenue) AS net_revenue,
            SUM(foi.cogs) AS cogs,
            SUM(foi.margin) AS margin
          FROM warehouse.fact_order_item foi
          CROSS JOIN location_base lb
          WHERE foi.pipeline_run_id = CAST(${pipelineRunId} AS UUID)
            AND foi.location_key = lb.location_key
          GROUP BY
            foi.pipeline_run_id,
            foi.date_key,
            foi.location_key,
            foi.menu_item_key
          ON CONFLICT (pipeline_run_id, date_key, location_key, menu_item_key)
          DO UPDATE SET
            qty = EXCLUDED.qty,
            net_revenue = EXCLUDED.net_revenue,
            cogs = EXCLUDED.cogs,
            margin = EXCLUDED.margin
          RETURNING 1
        )
        SELECT COUNT(*)::BIGINT AS aggregated_rows
        FROM upserted
      `;

        warehouseBackfill = {
          pipelineRunId,
          updatedOrderRows: Number(updateRows[0]?.updated_rows ?? 0),
          aggregatedDailyRows: Number(dailyRows[0]?.aggregated_rows ?? 0),
        };
      });
    }

    await markStageJobTerminal(cogsStageJob.id, "cogs_enrichment", {
      status: "succeeded",
      pipelineRunId: latestSucceededEtlJob?.pipelineRunId ?? null,
      analyticsId,
      outputRef: {
        analyticsId,
        cogsVersionHash,
        warehouseBackfill,
      },
    });

    // Return updated matrix
    return NextResponse.json({
      success: true,
      matrix: enrichedMatrix,
      warehouseBackfill,
      cogsStage: {
        idempotencyKey: cogsStageIdempotencyKey,
        jobId: cogsStageJob.id,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "COGS_ENRICHMENT_FAILED";
    await markStageJobTerminal(cogsStageJob.id, "cogs_enrichment", {
      status: "failed",
      errorCode: "COGS_ENRICHMENT_FAILED",
      errorMessage: message,
      pipelineRunId: latestSucceededEtlJob?.pipelineRunId ?? null,
      analyticsId,
    });

    return NextResponse.json(
      { message: "COGS_UPDATE_FAILED", detail: message },
      { status: 500 },
    );
  }
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
