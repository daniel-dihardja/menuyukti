export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import {
  loadInstagramAttribution,
  resolveAttributionViewState,
  summarizeAttribution,
  type InstagramAttributionRow,
} from "@/lib/analytics/instagram-attribution";
import {
  evaluateAttributionConfidence,
  parseConfidenceConfig,
} from "@/lib/analytics/instagram-attribution-confidence";
import { formatCurrency as formatCurrencyValue } from "@/lib/currency";
import { prisma } from "@/lib/prisma/client";
import { routes } from "@/lib/routes";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseDateParam(value: string | string[] | undefined): Date | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseLimit(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 200;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 200;
  return Math.min(parsed, 2000);
}

function parsePostId(value: string | string[] | undefined): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

function formatCurrency(value: number, currencyCode: string): string {
  return formatCurrencyValue(value, currencyCode);
}

function formatSignedNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value);
}

function renderConfidenceBadge(confidence: string) {
  const normalized = confidence.toLowerCase();
  if (normalized === "high") return <Badge variant="default">{confidence}</Badge>;
  if (normalized === "medium") return <Badge variant="secondary">{confidence}</Badge>;
  if (normalized === "low" || normalized === "warn") return <Badge variant="outline">{confidence}</Badge>;
  return <Badge variant="destructive">{confidence}</Badge>;
}

function reasonLabel(reason: string): string {
  if (reason === "low_pre_active_days") return "Low pre-window active days";
  if (reason === "low_post_active_days") return "Low post-window active days";
  if (reason === "low_coverage_ratio") return "Low coverage ratio";
  if (reason === "quality_failed") return "Quality failed";
  if (reason === "freshness_stale") return "Freshness stale";
  if (reason === "quality_warn") return "Quality warning";
  return reason;
}

function buildFromToLabel(from: Date | null, to: Date | null): string {
  if (from && to) return `${formatDate(from)} -> ${formatDate(to)}`;
  if (from) return `${formatDate(from)} -> now`;
  if (to) return `up to ${formatDate(to)}`;
  return "All available";
}

type AttributionRowWithConfidence = {
  row: InstagramAttributionRow;
  tunedConfidence: string;
  sourceConfidence: string;
  confidenceReasons: string[];
  coverageRatio: number;
};

function AttributionTable({
  rows,
  currencyCode,
}: {
  rows: AttributionRowWithConfidence[];
  currencyCode: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Published</TableHead>
            <TableHead>Post</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Menu</TableHead>
            <TableHead className="text-right">Pre Qty</TableHead>
            <TableHead className="text-right">Post Qty</TableHead>
            <TableHead className="text-right">Delta Qty</TableHead>
            <TableHead className="text-right">Delta Revenue</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Window (days)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ row, tunedConfidence, sourceConfidence, confidenceReasons, coverageRatio }) => (
            <TableRow key={`${row.instagramPostId}-${row.canonicalMenuName}-${row.publishedAt.toISOString()}`}>
              <TableCell>{formatDate(row.publishedAt)}</TableCell>
              <TableCell>#{row.instagramPostId}</TableCell>
              <TableCell>{row.campaignId ? `#${row.campaignId}` : "-"}</TableCell>
              <TableCell>{row.canonicalMenuName}</TableCell>
              <TableCell className="text-right">{row.preQty.toFixed(1)}</TableCell>
              <TableCell className="text-right">{row.postQty.toFixed(1)}</TableCell>
              <TableCell className="text-right">{formatSignedNumber(row.deltaQty)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.deltaRevenue, currencyCode)}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {renderConfidenceBadge(tunedConfidence)}
                  {tunedConfidence !== sourceConfidence ? (
                    <p className="text-xs text-muted-foreground">Source: {sourceConfidence}</p>
                  ) : null}
                  {confidenceReasons.length > 0 ? (
                    <p className="max-w-60 text-xs text-muted-foreground">
                      {confidenceReasons.join(", ")}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {row.attributionWindowDays}
                <p className="text-xs text-muted-foreground">{Math.round(coverageRatio * 100)}%</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function AttributionPage({ params, searchParams }: PageProps) {
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
      periodStart: true,
      periodEnd: true,
      location: {
        select: {
          currencyCode: true,
        },
      },
    },
  });

  if (!analytics) notFound();

  const query = await searchParams;
  const confidenceParamsEntries: string[][] = Object.entries(query).flatMap(([key, value]) =>
    Array.isArray(value) ? value.map((v) => [key, v]) : value ? [[key, value]] : [],
  );
  const confidenceConfig = parseConfidenceConfig(new URLSearchParams(confidenceParamsEntries));
  const from = parseDateParam(query.from) ?? analytics.periodStart;
  const to = parseDateParam(query.to) ?? analytics.periodEnd;
  const limit = parseLimit(query.limit);
  const postIdFilter = parsePostId(query.postId);
  const menuFilter = typeof query.menu === "string" ? query.menu.trim().toLowerCase() : "";

  const analyticsName = analytics.sourceFile ?? `Analytics #${analytics.id}`;
  const currencyCode = analytics.location?.currencyCode ?? "IDR";

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
  const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
  const freshnessMinutes = pipelineRun
    ? Math.max(0, Math.floor((Date.now() - new Date(pipelineRun.ingested_at_utc).getTime()) / 60_000))
    : null;
  const isStale = freshnessMinutes !== null && freshnessMinutes > freshnessSlaMinutes;
  const qualityStatus = pipelineRun?.quality_status ?? null;

  let rows: InstagramAttributionRow[] = [];
  let loadError: string | null = null;
  try {
    rows = await loadInstagramAttribution({
      locationId: analytics.locationId,
      from,
      to,
      limit,
    });
  } catch (error) {
    console.error("Load attribution overview error:", error);
    loadError = "Unable to load attribution data right now. Please verify the attribution mart and retry.";
  }

  const filteredRows = rows.filter((row) => {
    const byPost = postIdFilter == null || row.instagramPostId === postIdFilter;
    const byMenu = !menuFilter || row.canonicalMenuName.toLowerCase() === menuFilter;
    return byPost && byMenu;
  });

  const overview = summarizeAttribution(filteredRows);
  const rowsWithConfidence: AttributionRowWithConfidence[] = filteredRows.map((row) => {
    const tuned = evaluateAttributionConfidence(
      row,
      confidenceConfig,
      {
        qualityStatus,
        isStale,
      },
    );
    return {
      row,
      tunedConfidence: tuned.confidence,
      sourceConfidence: tuned.sourceConfidence,
      confidenceReasons: tuned.reasons.map(reasonLabel),
      coverageRatio: tuned.coverageRatio,
    };
  });
  const viewState = resolveAttributionViewState(filteredRows, loadError);

  return (
    <AnalyticsPageShell
      title="Instagram Attribution Overview"
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: "Attribution" },
      ]}
    >
      <PageHeading
        title="Instagram Attribution Overview"
        description="Review campaign/post outcomes by promoted menu item using deterministic pre/post windows and confidence signals."
      />

      <section className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Window: {buildFromToLabel(from ?? null, to ?? null)}</Badge>
        <Badge variant="outline">Rows: {overview.totalRows}</Badge>
        {postIdFilter != null ? <Badge variant="outline">Post: #{postIdFilter}</Badge> : null}
        {menuFilter ? <Badge variant="outline">Menu: {menuFilter}</Badge> : null}
        <Badge variant="outline">Quality: {qualityStatus ?? "unknown"}</Badge>
        {freshnessMinutes !== null ? (
          <Badge variant={isStale ? "destructive" : "secondary"}>Freshness: {freshnessMinutes}m</Badge>
        ) : null}
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href={routes.analytics.scheduler(analyticsId)}>Go to Scheduler</Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confidence Tuning</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" method="GET">
            <div className="space-y-1">
              <Label htmlFor="minActiveDays">Min active days</Label>
              <Input
                id="minActiveDays"
                name="minActiveDays"
                type="number"
                min={1}
                max={7}
                defaultValue={String(confidenceConfig.minActiveDays)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minCoverageRatio">Min coverage ratio</Label>
              <Input
                id="minCoverageRatio"
                name="minCoverageRatio"
                type="number"
                min={0.1}
                max={1}
                step={0.01}
                defaultValue={String(confidenceConfig.minCoverageRatio)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                Apply confidence thresholds
              </Button>
            </div>
            {typeof query.from === "string" ? <input type="hidden" name="from" value={query.from} /> : null}
            {typeof query.to === "string" ? <input type="hidden" name="to" value={query.to} /> : null}
            {typeof query.limit === "string" ? <input type="hidden" name="limit" value={query.limit} /> : null}
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unique Posts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{overview.uniquePosts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promoted Items</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{overview.uniqueItems}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Positive Revenue Rows</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{overview.positiveRevenueRows}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Delta Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(overview.avgDeltaRevenue, currencyCode)}
          </CardContent>
        </Card>
      </section>

      {viewState === "error" ? (
        <Card>
          <CardHeader>
            <CardTitle>Attribution Data Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      ) : viewState === "empty" ? (
        <Card>
          <CardHeader>
            <CardTitle>No Attribution Records Yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              No campaign/post attribution records were found for this location and date window.
            </p>
            <p>
              Recovery actions: ensure posts have promoted-item mappings, verify published post timestamps, and rerun ETL.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AttributionTable rows={rowsWithConfidence} currencyCode={currencyCode} />
      )}
    </AnalyticsPageShell>
  );
}
