import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { AnalyticsResponse } from "../types";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

export const runtime = "nodejs";

const normalizeMenuName = (name: string) => name.trim().toLowerCase();
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const legacyJsonWritesEnabled = process.env.LEGACY_JSON_WRITES_ENABLED !== "0";
const toFiniteNumber = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  const dt = new Date(String(value));
  return Number.isNaN(dt.getTime()) ? null : dt;
};
const absDiff = (a: number, b: number): number => Math.abs(a - b);
const requiredFieldRejectionReason = (
  row: Record<string, unknown>,
): string | null => {
  const checks: Array<{ key: string; valid: boolean }> = [
    { key: "bill_number", valid: String(row.bill_number ?? "").trim().length > 0 },
    { key: "menu", valid: String(row.menu ?? "").trim().length > 0 },
    { key: "qty", valid: toFiniteNumber(row.qty) !== null },
    { key: "price", valid: toFiniteNumber(row.price) !== null },
    {
      key: "total_after_bill_discount",
      valid: toFiniteNumber(row.total_after_bill_discount) !== null,
    },
    { key: "order_time", valid: toDateOrNull(row.order_time) !== null },
    {
      key: "menu_category",
      valid: String(row.menu_category ?? "").trim().length > 0,
    },
    {
      key: "menu_category_detail",
      valid: String(row.menu_category_detail ?? "").trim().length > 0,
    },
  ];

  const failed = checks.find((item) => !item.valid);
  return failed ? `missing_required_field:${failed.key}` : null;
};

const failJob = async (
  jobId: string,
  message: string,
  status: "failed" | "failed_quality_gate" = "failed",
) => {
  await prisma.etlJob.update({
    where: { id: jobId },
    data: {
      status,
      errorMessage: message.slice(0, 1024),
      finishedAt: new Date(),
    },
  });
};

async function processUploadJob(params: {
  jobId: string;
  locationId: number;
  fileName: string;
  fileBytes: Buffer;
}) {
  const pipelineStart = Date.now();

  try {
    await prisma.etlJob.update({
      where: { id: params.jobId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    const ANALYTICS_API_URL = process.env.ANALYTICS_API_URL;
    if (!ANALYTICS_API_URL) {
      throw new Error("ANALYTICS_API_URL_NOT_CONFIGURED");
    }

    const branchExists = await prisma.location.findUnique({
      where: { id: params.locationId },
      select: { id: true, name: true, currencyCode: true },
    });

    if (!branchExists) {
      throw new Error("BRANCH_NOT_FOUND");
    }

    const file = new File([new Uint8Array(params.fileBytes)], params.fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

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
        throw new Error("ANALYTICS_SERVICE_TIMEOUT");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!apiResponse.ok) {
      console.error("Analytics API error:", await apiResponse.text());
      throw new Error("ANALYTICS_SERVICE_FAILED");
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
    const rawRows = Array.isArray(apiResult.staging?.raw_rows)
      ? apiResult.staging.raw_rows
      : [];
    const rejectedRows = Array.isArray(apiResult.staging?.rejected_rows)
      ? apiResult.staging.rejected_rows
      : [];

    const requiredFieldRejectedRows = rawRows
      .map((row) => (row ?? {}) as Record<string, unknown>)
      .map((row) => ({
        row_data: row,
        rejection_reason: requiredFieldRejectionReason(row),
      }))
      .filter(
        (
          row,
        ): row is {
          row_data: Record<string, unknown>;
          rejection_reason: string;
        } => row.rejection_reason !== null,
      );

    const combinedRejectedRows = [...rejectedRows, ...requiredFieldRejectedRows];
    const inputRows = rawRows.length + combinedRejectedRows.length;
    const rejectRate =
      inputRows > 0 ? combinedRejectedRows.length / inputRows : 0;
    const qualityGateMaxRejectRate = Number(
      process.env.QUALITY_GATE_MAX_REJECT_RATE ?? "0.4",
    );
    const threshold = Number.isFinite(qualityGateMaxRejectRate)
      ? qualityGateMaxRejectRate
      : 0.4;
    const qualityGatePassed = rejectRate <= threshold;

    if (!qualityGatePassed) {
      throw new Error(
        `QUALITY_GATE_FAILED: input_rows=${inputRows}, rejected_rows=${combinedRejectedRows.length}, reject_rate=${rejectRate}, threshold=${threshold}`,
      );
    }

    let createdAnalyticsId: number | null = null;

    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`
          INSERT INTO warehouse.dim_pipeline_run
            (pipeline_run_id, schema_version, source_system, source_file, ingested_at_utc, quality_status)
          VALUES
            (
              CAST(${pipelineRunId} AS UUID),
              ${schemaVersion},
              ${sourceSystem},
              ${params.fileName},
              ${ingestedAtUtc},
              ${qualityStatus}
            )
          ON CONFLICT (pipeline_run_id) DO NOTHING
        `;

        const dimLocationRows = await tx.$queryRaw<Array<{ location_key: number }>>`
          INSERT INTO warehouse.dim_location
            (operational_location_id, location_name, currency_code, is_active, updated_at)
          VALUES
            (${params.locationId}, ${branchExists.name}, ${branchExists.currencyCode}, TRUE, NOW())
          ON CONFLICT (operational_location_id)
          DO UPDATE SET
            location_name = EXCLUDED.location_name,
            currency_code = EXCLUDED.currency_code,
            is_active = TRUE,
            updated_at = NOW()
          RETURNING location_key
        `;
        const locationKey = dimLocationRows[0]?.location_key;

        await tx.$executeRaw`
          INSERT INTO warehouse.dim_pos_source
            (source_system)
          VALUES
            (${sourceSystem})
          ON CONFLICT (source_system) DO NOTHING
        `;

        const rawBatch: Prisma.StgPosRawCreateManyInput[] = [];
        const cleanBatch: Prisma.StgPosCleanCreateManyInput[] = [];
        const dimDateByKey = new Map<number, Prisma.DimDateCreateManyInput>();

        for (const row of rawRows) {
          const safeRow = (row ?? {}) as Record<string, unknown>;
          const serialized = JSON.stringify(safeRow);
          const rowHash = createHash("sha256").update(serialized).digest("hex");

          rawBatch.push({
            pipelineRunId,
            sourceSystem,
            sourceFile: params.fileName,
            rowHash,
            rowData: safeRow as Prisma.InputJsonValue,
            ingestedAtUtc,
          });

          const billNumber = String(safeRow.bill_number ?? "").trim();
          const menu = String(safeRow.menu ?? "").trim();
          const qty = toFiniteNumber(safeRow.qty);
          const price = toFiniteNumber(safeRow.price);
          const totalAfterDiscount = toFiniteNumber(
            safeRow.total_after_bill_discount,
          );
          const orderTime = toDateOrNull(safeRow.order_time);
          const menuCategory = String(safeRow.menu_category ?? "").trim();
          const menuCategoryDetail = String(safeRow.menu_category_detail ?? "").trim();

          if (
            !billNumber ||
            !menu ||
            qty === null ||
            price === null ||
            totalAfterDiscount === null ||
            !orderTime ||
            !menuCategory ||
            !menuCategoryDetail
          ) {
            continue;
          }

          cleanBatch.push({
            pipelineRunId,
            sourceSystem,
            sourceFile: params.fileName,
            rowHash,
            billNumber,
            menu,
            qty,
            price,
            totalAfterBillDiscount: totalAfterDiscount,
            orderTime,
            menuCategory,
            menuCategoryDetail,
            ingestedAtUtc,
          });

          const businessDate = new Date(
            Date.UTC(
              orderTime.getUTCFullYear(),
              orderTime.getUTCMonth(),
              orderTime.getUTCDate(),
            ),
          );
          const dateKey = Number(
            `${businessDate.getUTCFullYear()}${String(
              businessDate.getUTCMonth() + 1,
            ).padStart(2, "0")}${String(businessDate.getUTCDate()).padStart(2, "0")}`,
          );
          const weekdayIso =
            businessDate.getUTCDay() === 0 ? 7 : businessDate.getUTCDay();
          const isWeekend = weekdayIso >= 6;

          if (!dimDateByKey.has(dateKey)) {
            dimDateByKey.set(dateKey, {
              dateKey,
              fullDate: businessDate,
              dayOfMonth: businessDate.getUTCDate(),
              monthOfYear: businessDate.getUTCMonth() + 1,
              yearNumber: businessDate.getUTCFullYear(),
              weekdayIso,
              isWeekend,
            });
          }
        }

        if (rawBatch.length > 0) {
          await tx.stgPosRaw.createMany({
            data: rawBatch,
            skipDuplicates: true,
          });
        }

        if (cleanBatch.length > 0) {
          await tx.stgPosClean.createMany({
            data: cleanBatch,
            skipDuplicates: true,
          });
        }

        if (dimDateByKey.size > 0) {
          await tx.dimDate.createMany({
            data: Array.from(dimDateByKey.values()),
            skipDuplicates: true,
          });
        }

        const rejectedBatch: Prisma.StgPosRejectedCreateManyInput[] = [];
        for (const rejected of combinedRejectedRows) {
          const rowData = rejected?.row_data ?? {};
          const serialized = JSON.stringify(rowData);
          const rowHash = createHash("sha256").update(serialized).digest("hex");
          const reason = rejected?.rejection_reason ?? "unknown";
          rejectedBatch.push({
            pipelineRunId,
            sourceSystem,
            sourceFile: params.fileName,
            rowHash,
            rowData: rowData as Prisma.InputJsonValue,
            rejectionReason: reason,
            ingestedAtUtc,
          });
        }

        if (rejectedBatch.length > 0) {
          await tx.stgPosRejected.createMany({
            data: rejectedBatch,
            skipDuplicates: true,
          });
        }

        const analyticsRecord = await tx.analytics.create({
          data: {
            locationId: params.locationId,
            sourceFile: params.fileName,
            periodStart: analytics.period_start
              ? new Date(analytics.period_start)
              : null,
            periodEnd: analytics.period_end ? new Date(analytics.period_end) : null,
            totalOrders: analytics.total_orders,
            totalItemsSold: analytics.total_items_sold,
            totalRevenue: analytics.total_revenue,
            avgOrderRevenue: analytics.avg_order_revenue,
            avgOrderItems: analytics.avg_order_items,
            avgPopularity: analytics.avg_popularity,
            maxOrderItems: analytics.max_order_items,
            minOrderItems: analytics.min_order_items,
            maxOrderRevenue: analytics.max_order_revenue,
            minOrderRevenue: analytics.min_order_revenue,
            popularityJson: legacyJsonWritesEnabled
              ? analytics.popularity_index ?? Prisma.JsonNull
              : Prisma.JsonNull,
            heatmapJson: legacyJsonWritesEnabled
              ? analytics.menu_heatmaps ?? Prisma.JsonNull
              : Prisma.JsonNull,
          },
        });

        createdAnalyticsId = analyticsRecord.id;

        const previousAnalytics = await tx.analytics.findFirst({
          where: {
            locationId: params.locationId,
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

        if (apiResult.menu_items.length > 0) {
          await tx.analyticsMenuItem.createMany({
            data: apiResult.menu_items.map((item) => ({
              analyticsId: analyticsRecord.id,
              menuName: item.menu,
              menuCategory: item.menu_category,
              menuCategoryDetail: item.menu_category_detail,
              quantity: item.quantity,
              totalRevenue: item.total_revenue,
              cogs: previousCogsMap.get(normalizeMenuName(item.menu)) ?? null,
            })),
          });
        }

        const aliasRows = await tx.menuAlias.findMany({
          where: { locationId: params.locationId },
          select: {
            aliasNameNorm: true,
            canonicalMenuName: true,
            canonicalMenuNameNorm: true,
          },
        });
        const aliasMap = new Map(
          aliasRows.map((row) => [row.aliasNameNorm, row]),
        );

        if (locationKey && apiResult.menu_items.length > 0) {
          const validFrom = analytics.period_start
            ? new Date(analytics.period_start)
            : new Date();
          for (const item of apiResult.menu_items) {
            const sourceMenuName = String(item.menu ?? "").trim();
            if (!sourceMenuName) continue;

            const sourceMenuNameNorm = normalizeMenuName(sourceMenuName);
            const alias = aliasMap.get(sourceMenuNameNorm);
            const menuName = alias?.canonicalMenuName ?? sourceMenuName;
            const menuNameNorm = alias?.canonicalMenuNameNorm ?? sourceMenuNameNorm;
            const menuCategory = item.menu_category ?? null;
            const menuCategoryDetail = item.menu_category_detail ?? null;

            const currentRows = await tx.$queryRaw<
              Array<{
                menu_item_key: number;
                menu_category: string | null;
                menu_category_detail: string | null;
                menu_name: string;
              }>
            >`
              SELECT menu_item_key, menu_category, menu_category_detail, menu_name
              FROM warehouse.dim_menu_item
              WHERE location_key = ${locationKey}
                AND menu_name_norm = ${menuNameNorm}
                AND is_current = TRUE
              LIMIT 1
            `;

            const current = currentRows[0];
            if (!current) {
              await tx.$executeRaw`
                INSERT INTO warehouse.dim_menu_item
                  (
                    location_key,
                    menu_name,
                    menu_name_norm,
                    menu_category,
                    menu_category_detail,
                    valid_from,
                    valid_to,
                    is_current
                  )
                VALUES
                  (
                    ${locationKey},
                    ${menuName},
                    ${menuNameNorm},
                    ${menuCategory},
                    ${menuCategoryDetail},
                    ${validFrom},
                    NULL,
                    TRUE
                  )
                ON CONFLICT (location_key, menu_name_norm, is_current) DO NOTHING
              `;
              continue;
            }

            const changed =
              current.menu_name !== menuName ||
              current.menu_category !== menuCategory ||
              current.menu_category_detail !== menuCategoryDetail;

            if (changed) {
              await tx.$executeRaw`
                UPDATE warehouse.dim_menu_item
                SET is_current = FALSE,
                    valid_to = ${validFrom},
                    updated_at = NOW()
                WHERE menu_item_key = ${current.menu_item_key}
              `;

              await tx.$executeRaw`
                INSERT INTO warehouse.dim_menu_item
                  (
                    location_key,
                    menu_name,
                    menu_name_norm,
                    menu_category,
                    menu_category_detail,
                    valid_from,
                    valid_to,
                    is_current
                  )
                VALUES
                  (
                    ${locationKey},
                    ${menuName},
                    ${menuNameNorm},
                    ${menuCategory},
                    ${menuCategoryDetail},
                    ${validFrom},
                    NULL,
                    TRUE
                  )
              `;
            }
          }
        }

        if (locationKey) {
          await tx.$executeRaw`
            INSERT INTO warehouse.fact_order_item
              (
                pipeline_run_id,
                date_key,
                location_key,
                menu_item_key,
                pos_source_key,
                bill_number,
                line_number,
                qty,
                gross_revenue,
                net_revenue,
                discount,
                cogs,
                margin,
                order_time,
                row_hash
              )
            SELECT
              CAST(${pipelineRunId} AS UUID),
              dd.date_key,
              ${locationKey},
              dmi.menu_item_key,
              dps.pos_source_key,
              sc.bill_number,
              NULL,
              sc.qty,
              (sc.price * sc.qty) AS gross_revenue,
              sc.total_after_bill_discount AS net_revenue,
              ((sc.price * sc.qty) - sc.total_after_bill_discount) AS discount,
              NULL,
              NULL,
              sc.order_time,
              sc.row_hash
            FROM staging.stg_pos_clean sc
            INNER JOIN warehouse.dim_date dd
              ON dd.full_date = (sc.order_time AT TIME ZONE 'UTC')::date
          INNER JOIN warehouse.dim_pos_source dps
            ON dps.source_system = ${sourceSystem}
          LEFT JOIN public.menu_alias ma
            ON ma.branch_id = ${params.locationId}
           AND ma.alias_name_norm = lower(trim(sc.menu))
          INNER JOIN warehouse.dim_menu_item dmi
            ON dmi.location_key = ${locationKey}
            AND dmi.menu_name_norm = COALESCE(ma.canonical_menu_name_norm, lower(trim(sc.menu)))
            AND dmi.is_current = TRUE
            WHERE sc.pipeline_run_id = CAST(${pipelineRunId} AS UUID)
            ON CONFLICT (pipeline_run_id, row_hash) DO NOTHING
          `;

          await tx.$executeRaw`
            INSERT INTO warehouse.fact_menu_hourly
              (
                pipeline_run_id,
                date_key,
                location_key,
                menu_item_key,
                hour_of_day,
                qty,
                net_revenue
              )
            SELECT
              foi.pipeline_run_id,
              foi.date_key,
              foi.location_key,
              foi.menu_item_key,
              EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC'))::INT AS hour_of_day,
              SUM(foi.qty) AS qty,
              SUM(foi.net_revenue) AS net_revenue
            FROM warehouse.fact_order_item foi
            WHERE foi.pipeline_run_id = CAST(${pipelineRunId} AS UUID)
            GROUP BY
              foi.pipeline_run_id,
              foi.date_key,
              foi.location_key,
              foi.menu_item_key,
              EXTRACT(HOUR FROM (foi.order_time AT TIME ZONE 'UTC'))::INT
            ON CONFLICT (pipeline_run_id, date_key, location_key, menu_item_key, hour_of_day)
            DO UPDATE SET
              qty = EXCLUDED.qty,
              net_revenue = EXCLUDED.net_revenue
          `;

          await tx.$executeRaw`
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
            WHERE foi.pipeline_run_id = CAST(${pipelineRunId} AS UUID)
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
          `;

          const warehouseAggRows = await tx.$queryRaw<
            Array<{
              total_orders: string | number;
              total_items_sold: string | number;
              total_revenue: string | number;
            }>
          >`
            SELECT
              COUNT(DISTINCT foi.bill_number) AS total_orders,
              COALESCE(SUM(foi.qty), 0) AS total_items_sold,
              COALESCE(SUM(foi.net_revenue), 0) AS total_revenue
            FROM warehouse.fact_order_item foi
            WHERE foi.pipeline_run_id = CAST(${pipelineRunId} AS UUID)
              AND foi.location_key = ${locationKey}
          `;

          const warehouseAgg = warehouseAggRows[0] ?? {
            total_orders: 0,
            total_items_sold: 0,
            total_revenue: 0,
          };
          const reconciliations = [
            {
              metric_name: "total_orders",
              legacy_value: Number(analytics.total_orders ?? 0),
              warehouse_value: Number(warehouseAgg.total_orders ?? 0),
              threshold_value: 0,
            },
            {
              metric_name: "total_items_sold",
              legacy_value: Number(analytics.total_items_sold ?? 0),
              warehouse_value: Number(warehouseAgg.total_items_sold ?? 0),
              threshold_value: 0.000001,
            },
            {
              metric_name: "total_revenue",
              legacy_value: Number(analytics.total_revenue ?? 0),
              warehouse_value: Number(warehouseAgg.total_revenue ?? 0),
              threshold_value: 0.01,
            },
          ];

          for (const item of reconciliations) {
            const delta = absDiff(item.legacy_value, item.warehouse_value);
            const withinThreshold = delta <= item.threshold_value;
            await tx.$executeRaw`
              INSERT INTO warehouse.pipeline_reconciliation_report
                (
                  pipeline_run_id,
                  location_key,
                  metric_name,
                  legacy_value,
                  warehouse_value,
                  delta,
                  within_threshold,
                  threshold_value
                )
              VALUES
                (
                  CAST(${pipelineRunId} AS UUID),
                  ${locationKey},
                  ${item.metric_name},
                  ${item.legacy_value},
                  ${item.warehouse_value},
                  ${delta},
                  ${withinThreshold},
                  ${item.threshold_value}
                )
            `;
          }
        }

        const loadDurationMs = Date.now() - pipelineStart;
        await tx.$executeRaw`
          INSERT INTO warehouse.pipeline_run_metrics
            (
              pipeline_run_id,
              input_rows,
              valid_rows,
              rejected_rows,
              reject_rate,
              load_duration_ms,
              quality_gate_passed
            )
          VALUES
            (
              CAST(${pipelineRunId} AS UUID),
              ${inputRows},
              ${rawRows.length},
              ${combinedRejectedRows.length},
              ${rejectRate},
              ${loadDurationMs},
              ${qualityGatePassed}
            )
          ON CONFLICT (pipeline_run_id)
          DO UPDATE SET
            input_rows = EXCLUDED.input_rows,
            valid_rows = EXCLUDED.valid_rows,
            rejected_rows = EXCLUDED.rejected_rows,
            reject_rate = EXCLUDED.reject_rate,
            load_duration_ms = EXCLUDED.load_duration_ms,
            quality_gate_passed = EXCLUDED.quality_gate_passed
        `;
      },
      { maxWait: 10_000, timeout: 180_000 },
    );

    await prisma.etlJob.update({
      where: { id: params.jobId },
      data: {
        status: "succeeded",
        analyticsId: createdAnalyticsId,
        pipelineRunId,
        finishedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    console.error("Upload job failed:", error);
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    const status = message.startsWith("QUALITY_GATE_FAILED")
      ? "failed_quality_gate"
      : "failed";
    await failJob(params.jobId, message, status);
  }
}

export async function POST(request: Request) {
  try {
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

    const branchExists = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!branchExists) {
      return NextResponse.json({ error: "BRANCH_NOT_FOUND" }, { status: 404 });
    }

    const fileBytes = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash("sha256").update(fileBytes).digest("hex");
    const idempotencyKey = createHash("sha256")
      .update(`location:${locationId}:file:${fileHash}`)
      .digest("hex");

    let job: { id: string };
    try {
      job = await prisma.etlJob.create({
        data: {
          locationId,
          sourceFile: file.name,
          fileHash,
          idempotencyKey,
          status: "queued",
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingJob = await prisma.etlJob.findFirst({
          where: { idempotencyKey },
          select: { id: true, status: true },
        });

        if (existingJob) {
          return NextResponse.json(
            {
              status: "duplicate",
              duplicate: true,
              jobId: existingJob.id,
              jobStatus: existingJob.status,
            },
            { status: 200 },
          );
        }
      }

      throw error;
    }

    void processUploadJob({
      jobId: job.id,
      locationId,
      fileName: file.name,
      fileBytes,
    });

    return NextResponse.json(
      {
        status: "accepted",
        jobId: job.id,
      },
      { status: 202 },
    );
  } catch (error: unknown) {
    console.error("Upload enqueue error:", error);
    return NextResponse.json({ error: "UPLOAD_ENQUEUE_FAILED" }, { status: 500 });
  }
}
