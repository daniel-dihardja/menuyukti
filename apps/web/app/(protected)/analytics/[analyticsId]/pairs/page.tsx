export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";

import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma/client";
import { routes } from "@/lib/routes";
import { parsePairFilterState } from "@/lib/analytics/pair-filter-state";

import { PairsFilterBar } from "./pairs-filter-bar";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PairsPage({ params, searchParams }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const filters = parsePairFilterState(await searchParams);

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
      periodStart: true,
      periodEnd: true,
      totalOrders: true,
    },
  });

  if (!analytics) notFound();

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

  const pipelineRun = pipelineRunRows[0];
  const freshnessSlaMinutes = Number(
    process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440",
  );
  const freshnessMinutes = pipelineRun
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(pipelineRun.ingested_at_utc).getTime()) / 60_000,
        ),
      )
    : null;

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;

  return (
    <AnalyticsPageShell
      title="Pair and Combo Insights"
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: "Pairs" },
      ]}
    >
      <PageHeading
        title="Top Pair Menu Insights"
        description="Analyze co-purchase behavior and combo opportunities in a dedicated GUI."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="outline">Location #{analytics.locationId}</Badge>
        <Badge variant="outline">Orders: {analytics.totalOrders ?? "—"}</Badge>
        <Badge variant="outline">
          Quality: {pipelineRun?.quality_status ?? "unknown"}
        </Badge>
        <Badge variant={freshnessMinutes !== null && freshnessMinutes <= freshnessSlaMinutes ? "secondary" : "destructive"}>
          Freshness: {freshnessMinutes !== null ? `${freshnessMinutes} min` : "unknown"}
        </Badge>
      </div>

      <section className="border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Pair and Combo Analysis</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is now available as GUI workflow. Next steps include advanced filters,
          ranked tables, and explainability details.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          For now, you can still access exports directly from the analyst export API while
          using this page as your analysis entry point.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            className="text-sm underline underline-offset-4"
            href={`/api/exports/analyst?dataset=pairs&locationId=${analytics.locationId}&minSampleSize=1`}
          >
            Export Pair CSV
          </Link>
          <Link
            className="text-sm underline underline-offset-4"
            href={`/api/exports/analyst?dataset=combos&locationId=${analytics.locationId}&minPairOrders=1`}
          >
            Export Combo CSV
          </Link>
        </div>
      </section>

      <div className="mt-6">
        <PairsFilterBar filters={filters} />
      </div>
    </AnalyticsPageShell>
  );
}
