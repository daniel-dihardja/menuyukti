export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";
import { prisma } from "@/lib/prisma/client";
import { routes } from "@/lib/routes";

import { SchedulerClient } from "./scheduler-client";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Recommendation = {
  menuItem: string;
  action: "promote" | "reprice";
  actionReason: string;
  suggestedDaypart: string;
  confidence: "high" | "medium" | "low";
};

function dateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function endOfWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}

function parseWeekStart(raw: string | string[] | undefined, fallbackDate: Date): Date {
  if (typeof raw !== "string") return startOfWeek(fallbackDate);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return startOfWeek(fallbackDate);
  return startOfWeek(parsed);
}

function inferDaypartFromHour(hour: number): string {
  if (hour <= 10) return "morning";
  if (hour <= 14) return "lunch";
  if (hour <= 17) return "afternoon";
  return "evening";
}

function buildSuggestedDaypartByMenu(heatmapJson: unknown): Map<string, string> {
  const byMenu = new Map<string, string>();
  if (!Array.isArray(heatmapJson)) return byMenu;

  for (const rawItem of heatmapJson) {
    const item = rawItem as {
      menu?: unknown;
      dailyHeatmap?: Array<{ hour: string | number; quantity: number }>;
      daily_heatmap?: Array<{ hour: string | number; quantity: number }>;
    };
    if (typeof item.menu !== "string" || !item.menu.trim()) continue;
    const points = item.dailyHeatmap ?? item.daily_heatmap ?? [];
    if (!Array.isArray(points) || points.length === 0) continue;

    const best = [...points]
      .map((p) => {
        const hourNum = typeof p.hour === "number" ? p.hour : Number(String(p.hour).split(":")[0]);
        const qty = Number(p.quantity);
        return {
          hour: Number.isFinite(hourNum) ? hourNum : -1,
          qty: Number.isFinite(qty) ? qty : -1,
        };
      })
      .filter((p) => p.hour >= 0)
      .sort((a, b) => b.qty - a.qty)[0];

    if (!best) continue;
    byMenu.set(item.menu.trim(), inferDaypartFromHour(best.hour));
  }
  return byMenu;
}

function buildRecommendations(matrixJson: unknown, heatmapJson: unknown): Recommendation[] {
  const daypartByMenu = buildSuggestedDaypartByMenu(heatmapJson);
  const matrixRows = toDecisionGradeMatrixRows(matrixJson);

  return matrixRows
    .filter((row) => row.unitsSold > 0 && (row.action === "promote" || row.action === "reprice"))
    .sort((a, b) => {
      const actionPriority = (action: "promote" | "reprice") => (action === "promote" ? 2 : 1);
      const pA = actionPriority(a.action as "promote" | "reprice");
      const pB = actionPriority(b.action as "promote" | "reprice");
      if (pA !== pB) return pB - pA;
      if (a.contributionMargin !== b.contributionMargin) return b.contributionMargin - a.contributionMargin;
      return b.revenue - a.revenue;
    })
    .slice(0, 16)
    .map((row) => {
      const confidence: "high" | "medium" | "low" =
        row.action === "promote" && row.marginPct >= 0.45
          ? "high"
          : row.marginPct >= 0.25
            ? "medium"
            : "low";
      return {
        menuItem: row.menuItem,
        action: row.action as "promote" | "reprice",
        actionReason: row.actionReason,
        suggestedDaypart: daypartByMenu.get(row.menuItem) ?? "lunch",
        confidence,
      };
    });
}

export default async function SchedulerPage({ params, searchParams }: PageProps) {
  const tSales = await getTranslations("analytics.sales");

  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      id: true,
      sourceFile: true,
      locationId: true,
      periodEnd: true,
      matrixJson: true,
      heatmapJson: true,
    },
  });
  if (!analytics) notFound();

  const query = await searchParams;
  const fallbackDate = analytics.periodEnd ?? new Date();
  const weekStartDate = parseWeekStart(query.weekStart, fallbackDate);
  const weekEndDate = endOfWeek(weekStartDate);

  const recommendations = buildRecommendations(analytics.matrixJson, analytics.heatmapJson);

  const schedule = await prisma.instagramWeeklySchedule.findUnique({
    where: {
      locationId_weekStartDate: {
        locationId: analytics.locationId,
        weekStartDate,
      },
    },
    include: {
      entries: {
        orderBy: { scheduledFor: "asc" },
      },
    },
  });

  const etlJob = await prisma.etlJob.findFirst({
    where: {
      analyticsId,
      status: "succeeded",
      pipelineRunId: { not: null },
    },
    orderBy: { finishedAt: "desc" },
    select: { pipelineRunId: true },
  });

  const pipelineRunRows = etlJob?.pipelineRunId
    ? await prisma.$queryRaw<Array<{ ingested_at_utc: Date; quality_status: string }>>`
        SELECT ingested_at_utc, quality_status
        FROM warehouse.dim_pipeline_run
        WHERE pipeline_run_id = CAST(${etlJob.pipelineRunId} AS UUID)
        LIMIT 1
      `
    : [];

  const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
  const pipelineRun = pipelineRunRows[0];
  const freshnessMinutes = pipelineRun
    ? Math.max(0, Math.floor((Date.now() - new Date(pipelineRun.ingested_at_utc).getTime()) / 60_000))
    : null;
  const isStale = freshnessMinutes !== null && freshnessMinutes > freshnessSlaMinutes;

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;

  return (
    <AnalyticsPageShell
      title="Instagram Weekly Scheduler"
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: "Scheduler" },
      ]}
    >
      <PageHeading
        title="Instagram Weekly Scheduler"
        description="Plan weekly Instagram posts from deterministic recommendations, with trust signals and editable scheduling fields."
      />

      <SchedulerClient
        analyticsId={analyticsId}
        locationId={analytics.locationId}
        weekStartDate={dateToYmd(weekStartDate)}
        weekEndDate={dateToYmd(weekEndDate)}
        recommendations={recommendations}
        qualityStatus={pipelineRun?.quality_status ?? null}
        freshnessMinutes={freshnessMinutes}
        isStale={isStale}
        initialSchedule={
          schedule
            ? {
                id: schedule.id,
                status: schedule.status,
                source: schedule.source,
                entries: schedule.entries.map((entry) => ({
                  id: entry.id,
                  instagramCampaignId: entry.instagramCampaignId,
                  instagramPostId: entry.instagramPostId,
                  canonicalMenuName: entry.canonicalMenuName,
                  canonicalMenuNameNorm: entry.canonicalMenuNameNorm,
                  scheduledFor: entry.scheduledFor.toISOString(),
                  daypart: entry.daypart,
                  confidence: entry.confidence,
                  rationale: entry.rationale,
                  status: entry.status,
                })),
              }
            : null
        }
      />
    </AnalyticsPageShell>
  );
}
