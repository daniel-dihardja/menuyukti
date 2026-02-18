export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import { formatCurrencyWithCode, getCurrencyLocale } from "@/lib/currency";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { DecisionContractBanner } from "@/components/decision-contract-banner";
import { parseMatrixFilterState } from "@/lib/analytics/matrix-filter-state";
import { applyMatrixFilterState } from "@/lib/analytics/matrix-filter-engine";
import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";
import { summarizeCogsCoverage } from "@/lib/analytics/cogs-completeness";
import { evaluateCogsReadiness } from "@/lib/analytics/cogs-readiness";
import {
  createDecisionApiContract,
  createDecisionContext,
} from "@/lib/contracts/decision-api-contract";
import {
  loadPipelineFreshnessMetadata,
  resolveAnalyticsMaterialization,
} from "@/lib/etl/latest-valid-materialization";

import { MatrixFilterBar } from "./matrix-filter-bar";
import { MatrixInsightTable } from "./matrix-insight-table";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MatrixDistributionItem = {
  category: "star" | "plow_horse" | "puzzle" | "low_end";
  item_count?: number;
  item_share?: number;
  margin_share?: number;
  count?: number;
  percentage?: number;
  margin_contribution_percentage?: number;
};

type MatrixJson = {
  items: unknown[];
  distribution: MatrixDistributionItem[];
};

export default async function Page({ params, searchParams }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const tMatrix = await getTranslations("analytics.matrix");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { analyticsId: analyticsIdParam } = await params;
  const filters = parseMatrixFilterState(await searchParams);
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  // --------------------------------------------------
  // Fetch analytics snapshot
  // --------------------------------------------------
  const materialization = await resolveAnalyticsMaterialization({
    analyticsId,
    requiredField: "matrixJson",
  });
  if (!materialization) notFound();

  const analytics = await prisma.analytics.findUnique({
    where: { id: materialization.resolvedAnalyticsId },
    select: {
      id: true,
      sourceFile: true,
      location: {
        select: {
          currencyCode: true,
        },
      },
      periodStart: true,
      periodEnd: true,
      totalOrders: true,
      totalItemsSold: true,
      avgOrderRevenue: true,
      avgOrderItems: true,
      matrixJson: true,
      matrixDistributionJson: true,
    },
  });

  if (!analytics) notFound();

  const metadata = await loadPipelineFreshnessMetadata(analytics.id);
  const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
  const dataFreshnessMinutes = metadata.freshnessMinutes;
  const isStale = Boolean(metadata.stale);
  const qualityStatusRaw = String(metadata.qualityStatus ?? "").toLowerCase();
  const qualityStatus =
    qualityStatusRaw === "passed" ||
    qualityStatusRaw === "warn" ||
    qualityStatusRaw === "failed"
      ? qualityStatusRaw
      : "unknown";

  const analyticsName = analytics.sourceFile ?? `Analytics #${analytics.id}`;
  const matrix = analytics.matrixJson as MatrixJson | null;
  const currencyCode = analytics.location?.currencyCode ?? "IDR";

  if (!matrix) {
    return (
      <AnalyticsPageShell
        title={tMatrix("reportTitle")}
        breadcrumbs={[
          { label: tSales("title"), href: routes.analytics.sales },
          { label: analyticsName },
          { label: tMatrix("breadcrumb") },
        ]}
      >
        <section className="border rounded-md p-6 space-y-3">
          <PageHeading
            title={tMatrix("heading")}
            description={tMatrix("empty.description")}
          />
          <Button asChild>
            <Link href={routes.analytics.cogs(analyticsId)}>
              {tMatrix("empty.cta")}
            </Link>
          </Button>
        </section>
      </AnalyticsPageShell>
    );
  }

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------
  const locale = getCurrencyLocale(currencyCode);

  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const startDate = analytics.periodStart
    ? dateFormatter.format(analytics.periodStart)
    : "—";

  const endDate = analytics.periodEnd
    ? dateFormatter.format(analytics.periodEnd)
    : "—";

  const fmtCurrency = (value: number) =>
    formatCurrencyWithCode(value, currencyCode, locale);

  // --------------------------------------------------
  // Matrix helpers
  // --------------------------------------------------
  const matrixRows = toDecisionGradeMatrixRows(matrix);
  const filteredRows = applyMatrixFilterState(matrixRows, filters);
  const cogsCoverage = summarizeCogsCoverage(
    matrixRows.map((row) => ({
      cogs: row.cogs,
      revenue: row.revenue,
    })),
  );
  const cogsReadiness = evaluateCogsReadiness(cogsCoverage);
  const contract = createDecisionApiContract({
    surface: "matrix",
    context: createDecisionContext({
      persona: "analyst",
      locationId: materialization.locationId,
      analyticsId: materialization.resolvedAnalyticsId,
      filterState: filters,
      trust: {
        qualityStatus,
        freshnessMinutes: dataFreshnessMinutes,
        isStale,
        reasons: metadata.pipelineRunId ? [] : ["missing_pipeline_run"],
      },
      lineage: {
        pipelineRunId: metadata.pipelineRunId,
        sourceSystem: "warehouse",
        ingestedAtUtc: metadata.ingestedAtUtc,
      },
    }),
    evidence: [
      {
        source: "public_snapshot",
        entity: "public.analytics",
        metric: "matrix_row_count",
        value: matrixRows.length,
        key: { analyticsId: materialization.resolvedAnalyticsId },
        pipelineRunId: metadata.pipelineRunId,
      },
      {
        source: "derived_runtime",
        entity: "runtime.cogs_readiness",
        metric: "cogs_readiness",
        value: cogsReadiness.readiness,
        key: { analyticsId: materialization.resolvedAnalyticsId },
      },
    ],
  });

  const distribution =
    (analytics.matrixDistributionJson as MatrixDistributionItem[]) ??
    matrix.distribution ??
    [];

  const byCategory = (cat: MatrixDistributionItem["category"]) =>
    distribution.find((d) => d.category === cat);

  const categoryOrder = [
    "star",
    "plow_horse",
    "puzzle",
    "low_end",
  ] as const;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <AnalyticsPageShell
      title={tMatrix("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMatrix("breadcrumb") },
      ]}
    >
      <PageHeading
        title={tMatrix("heading")}
        description={tMatrix("description")}
      />
      <DecisionContractBanner
        contract={contract}
        fallbackApplied={materialization.fallbackApplied}
        fallbackLabel={`using latest valid materialization (#${materialization.resolvedAnalyticsId})`}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {tMatrix("actionsLabel")}
        </span>
        {materialization.fallbackApplied ? (
          <Badge variant="secondary">
            using latest valid materialization (#{materialization.resolvedAnalyticsId})
          </Badge>
        ) : null}
        <Badge variant="default">{tMatrix("actions.promote")}</Badge>
        <Badge variant="secondary">{tMatrix("actions.improve")}</Badge>
        <Badge variant="destructive">{tMatrix("actions.remove")}</Badge>
      </div>
      <div className="mb-8">
        <MatrixFilterBar filters={filters} analyticsId={analyticsId} />
      </div>

          {/* ---------------------------------------------
           * KPI OVERVIEW
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{tMatrix("overview.title")}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Period */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">{tMatrix("overview.period.title")}</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.period.start")}</span>{" "}
                    <span className="font-medium">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.period.end")}</span>{" "}
                    <span className="font-medium">{endDate}</span>
                  </div>
                </div>
              </div>

              {/* Orders & Items */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">{tMatrix("overview.ordersAndItems.title")}</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.ordersAndItems.orders")}</span>{" "}
                    <span className="font-medium">
                      {analytics.totalOrders?.toLocaleString(locale) ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.ordersAndItems.itemsSold")}</span>{" "}
                    <span className="font-medium">
                      {analytics.totalItemsSold?.toLocaleString(locale) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Averages */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">{tMatrix("overview.averages.title")}</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.averages.avgRevenue")}</span>{" "}
                    <span className="font-medium">
                      {analytics.avgOrderRevenue
                        ? fmtCurrency(Number(analytics.avgOrderRevenue))
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.averages.avgItems")}</span>{" "}
                    <span className="font-medium">
                      {analytics.avgOrderItems?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pipeline metadata */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">Pipeline</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">Run:</span>{" "}
                    <span className="font-medium">
                      {metadata.pipelineRunId ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quality:</span>{" "}
                    <span className="font-medium">
                      {metadata.qualityStatus ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Freshness:</span>{" "}
                    <span className="font-medium">
                      {dataFreshnessMinutes !== null
                        ? `${dataFreshnessMinutes} min`
                        : "—"}
                    </span>
                  </div>
                </div>
                {isStale && (
                  <p className="text-xs text-amber-600 mt-2">
                    Data freshness SLA exceeded
                  </p>
                )}
              </div>

              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">COGS readiness</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      cogsReadiness.readiness === "blocked"
                        ? "destructive"
                        : cogsReadiness.readiness === "degraded"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {cogsReadiness.readiness}
                  </Badge>
                  <Badge variant="outline">
                    item coverage: {(cogsCoverage.itemCoverageRatio * 100).toFixed(1)}%
                  </Badge>
                  <Badge variant="outline">
                    revenue coverage: {(cogsCoverage.revenueCoverageRatio * 100).toFixed(1)}%
                  </Badge>
                </div>
                {cogsReadiness.reasons.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {cogsReadiness.reasons.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------
           * MATRIX DISTRIBUTION
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {tMatrix("distribution.title")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryOrder.map((key) => {
                const label = tMatrix(`categories.${key}`);
                const item = byCategory(key);
                const itemShare = item?.item_share ?? item?.percentage ?? 0;
                const share = Math.max(itemShare * 100, 0);

                return (
                  <div key={key} className="border p-4 shadow-sm bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{label}</p>
                    </div>

                    <div className="text-sm">
                      <div>
                        <span className="text-muted-foreground">{tMatrix("distribution.items")}</span>{" "}
                        <span className="font-medium">
                          {item?.item_count ?? item?.count ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tMatrix("distribution.share")}</span>{" "}
                        <span className="font-medium">
                          {item
                            ? `${share.toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tMatrix("distribution.margin")}</span>{" "}
                        <span className="font-medium">
                          {item
                            ? `${(
                                (item.margin_share ??
                                  item.margin_contribution_percentage ??
                                  0) * 100
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden bg-muted/60">
                      <div
                        className="h-full bg-foreground/30"
                        style={{ width: `${Math.min(share, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------------------------------------------
           * MATRIX DETAILS
           * --------------------------------------------- */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">{tMatrix("analysis.title")}</h2>
            <MatrixInsightTable
              items={filteredRows}
              locale={locale}
              currency={currencyCode}
              analyticsId={analyticsId}
            />
          </section>
    </AnalyticsPageShell>
  );
}
