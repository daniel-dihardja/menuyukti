export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
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

function buildFromToLabel(from: Date | null, to: Date | null): string {
  if (from && to) return `${formatDate(from)} -> ${formatDate(to)}`;
  if (from) return `${formatDate(from)} -> now`;
  if (to) return `up to ${formatDate(to)}`;
  return "All available";
}

function AttributionTable({ rows }: { rows: InstagramAttributionRow[] }) {
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
          {rows.map((row) => (
            <TableRow key={`${row.instagramPostId}-${row.canonicalMenuName}-${row.publishedAt.toISOString()}`}>
              <TableCell>{formatDate(row.publishedAt)}</TableCell>
              <TableCell>#{row.instagramPostId}</TableCell>
              <TableCell>{row.campaignId ? `#${row.campaignId}` : "-"}</TableCell>
              <TableCell>{row.canonicalMenuName}</TableCell>
              <TableCell className="text-right">{row.preQty.toFixed(1)}</TableCell>
              <TableCell className="text-right">{row.postQty.toFixed(1)}</TableCell>
              <TableCell className="text-right">{formatSignedNumber(row.deltaQty)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.deltaRevenue)}</TableCell>
              <TableCell>{renderConfidenceBadge(row.confidenceLevel)}</TableCell>
              <TableCell className="text-right">{row.attributionWindowDays}</TableCell>
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
    },
  });

  if (!analytics) notFound();

  const query = await searchParams;
  const from = parseDateParam(query.from) ?? analytics.periodStart;
  const to = parseDateParam(query.to) ?? analytics.periodEnd;
  const limit = parseLimit(query.limit);

  const analyticsName = analytics.sourceFile ?? `Analytics #${analytics.id}`;

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

  const overview = summarizeAttribution(rows);
  const viewState = resolveAttributionViewState(rows, loadError);

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
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href={routes.analytics.scheduler(analyticsId)}>Go to Scheduler</Link>
        </Button>
      </section>

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
          <CardContent className="text-2xl font-semibold">{formatCurrency(overview.avgDeltaRevenue)}</CardContent>
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
        <AttributionTable rows={rows} />
      )}
    </AnalyticsPageShell>
  );
}
