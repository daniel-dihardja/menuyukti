export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { CircleHelp } from "lucide-react";
import Link from "next/link";

import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { parsePairFilterState, serializePairFilterState } from "@/lib/analytics/pair-filter-state";
import type { PairType } from "@/lib/analytics/pair-type";
import { prisma } from "@/lib/prisma/client";
import { routes } from "@/lib/routes";
import {
  loadPipelineFreshnessMetadata,
  resolveAnalyticsMaterialization,
} from "@/lib/etl/latest-valid-materialization";

import { PairsFilterBar } from "./pairs-filter-bar";
import { PairsInsightPanels } from "./pairs-insight-panels";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PairRow = {
  pairKey: string;
  menuA: string;
  menuB: string;
  pairOrders: number;
  support: number;
  confidenceAtoB: number;
  confidenceBtoA: number;
  liftAtoB: number;
  liftBtoA: number;
  score: number;
  isNoisy: boolean;
  pairType: PairType;
};

type ComboRow = {
  pairKey: string;
  menuA: string;
  menuB: string;
  pairOrders: number;
  support: number;
  confidenceAtoB: number;
  confidenceBtoA: number;
  liftAtoB: number;
  liftBtoA: number;
  score: number;
  marginScore: number;
  confidenceLevel: string;
  pairType: PairType;
  pairTypeBoostFactor: number;
  pairTypeBoostApplied: boolean;
  baseScore: number;
};

function KpiLabelWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Explain ${label}`}
            className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground/80 hover:text-foreground"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="max-w-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object") {
    const maybeToNumber = (value as { toNumber?: () => unknown }).toNumber;
    if (typeof maybeToNumber === "function") {
      const parsed = Number(maybeToNumber.call(value));
      if (Number.isFinite(parsed)) return parsed;
    }

    const maybeToString = (value as { toString?: () => string }).toString;
    if (typeof maybeToString === "function") {
      const parsed = Number(maybeToString.call(value));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function sortPairRows(rows: PairRow[], sort: string, order: "asc" | "desc"): PairRow[] {
  const dir = order === "asc" ? 1 : -1;
  const getValue = (row: PairRow): number => {
    if (sort === "lift") return (row.liftAtoB + row.liftBtoA) / 2;
    if (sort === "pairOrders") return row.pairOrders;
    if (sort === "support") return row.support;
    if (sort === "confidence") return (row.confidenceAtoB + row.confidenceBtoA) / 2;
    return row.score;
  };

  return [...rows].sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    if (diff !== 0) return diff * dir;
    return a.pairKey.localeCompare(b.pairKey) * dir;
  });
}

function sortComboRows(rows: ComboRow[], sort: string, order: "asc" | "desc"): ComboRow[] {
  const dir = order === "asc" ? 1 : -1;
  const getValue = (row: ComboRow): number => {
    if (sort === "lift") return (row.liftAtoB + row.liftBtoA) / 2;
    if (sort === "pairOrders") return row.pairOrders;
    if (sort === "support") return row.support;
    if (sort === "confidence") return (row.confidenceAtoB + row.confidenceBtoA) / 2;
    return row.score;
  };

  return [...rows].sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    if (diff !== 0) return diff * dir;
    return a.pairKey.localeCompare(b.pairKey) * dir;
  });
}

export default async function PairsPage({ params, searchParams }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const filters = parsePairFilterState(await searchParams);

  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

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
      locationId: true,
      periodStart: true,
      periodEnd: true,
      totalOrders: true,
      totalItemsSold: true,
      totalRevenue: true,
    },
  });

  if (!analytics) notFound();
  const analyticsData = analytics;

  const metadata = await loadPipelineFreshnessMetadata(analytics.id);
  const freshnessSlaMinutes = Number(process.env.DATA_FRESHNESS_SLA_MINUTES ?? "1440");
  const freshnessMinutes = metadata.freshnessMinutes;

  const searchLike = `%${filters.q.replace(/%/g, "").replace(/_/g, "").trim()}%`;

  async function loadPairRows(minSampleSize: number) {
    return prisma.$queryRaw<
      Array<{
        menu_item_a_name: string;
        menu_item_b_name: string;
        pair_orders: string | number;
        support: string | number;
        confidence_a_to_b: string | number;
        confidence_b_to_a: string | number;
        lift_a_to_b: string | number;
        lift_b_to_a: string | number;
        is_noisy: boolean;
        pair_type: PairType;
      }>
    >`
      WITH location_base AS (
        SELECT d.location_key
        FROM warehouse.dim_location d
        WHERE d.operational_location_id = ${analyticsData.locationId}
      ),
      filtered AS (
        SELECT
          b.location_key,
          b.menu_item_a_key,
          b.menu_item_b_key,
          b.pair_orders,
          b.pair_qty,
          b.item_a_orders,
          b.item_b_orders,
          b.total_orders,
          b.pair_type,
          ma.menu_name AS menu_item_a_name,
          mb.menu_name AS menu_item_b_name
        FROM marts.vw_pair_metrics_daily_base b
        INNER JOIN location_base lb ON lb.location_key = b.location_key
        INNER JOIN warehouse.dim_menu_item ma ON ma.menu_item_key = b.menu_item_a_key
        INNER JOIN warehouse.dim_menu_item mb ON mb.menu_item_key = b.menu_item_b_key
        WHERE (${filters.q} = '' OR ma.menu_name ILIKE ${searchLike} OR mb.menu_name ILIKE ${searchLike})
      ),
      agg AS (
        SELECT
          menu_item_a_name,
          menu_item_b_name,
          pair_type,
          SUM(pair_orders)::NUMERIC(18, 6) AS pair_orders,
          SUM(item_a_orders)::NUMERIC(18, 6) AS item_a_orders,
          SUM(item_b_orders)::NUMERIC(18, 6) AS item_b_orders,
          SUM(total_orders)::NUMERIC(18, 6) AS total_orders
        FROM filtered
        GROUP BY menu_item_a_name, menu_item_b_name, pair_type
      )
      SELECT
        menu_item_a_name,
        menu_item_b_name,
        pair_orders,
        CASE WHEN total_orders = 0 THEN 0 ELSE pair_orders / total_orders END AS support,
        CASE WHEN item_a_orders = 0 THEN 0 ELSE pair_orders / item_a_orders END AS confidence_a_to_b,
        CASE WHEN item_b_orders = 0 THEN 0 ELSE pair_orders / item_b_orders END AS confidence_b_to_a,
        CASE
          WHEN total_orders = 0 OR item_a_orders = 0 OR item_b_orders = 0 THEN 0
          ELSE (pair_orders / item_a_orders) / (item_b_orders / total_orders)
        END AS lift_a_to_b,
        CASE
          WHEN total_orders = 0 OR item_a_orders = 0 OR item_b_orders = 0 THEN 0
          ELSE (pair_orders / item_b_orders) / (item_a_orders / total_orders)
        END AS lift_b_to_a,
        (pair_orders < ${minSampleSize}) AS is_noisy,
        pair_type
      FROM agg
      WHERE pair_orders >= ${minSampleSize}
        AND (${filters.pairType}::text = 'all' OR pair_type = ${filters.pairType}::text)
      ORDER BY pair_orders DESC
      LIMIT ${Math.max(filters.limit, 200)}
    `;
  }

  async function loadComboRows(minSampleSize: number) {
    return prisma.$queryRaw<
      Array<{
        menu_item_a_name: string;
        menu_item_b_name: string;
        pair_orders: string | number;
        support: string | number;
        confidence_a_to_b: string | number;
        confidence_b_to_a: string | number;
        lift_a_to_b: string | number;
        lift_b_to_a: string | number;
        margin_score: string | number;
        combo_opportunity_score: string | number;
        confidence_level: string;
        pair_type: PairType;
        pair_type_boost_factor: string | number;
        pair_type_boost_applied: boolean;
        base_combo_opportunity_score: string | number;
      }>
    >`
      SELECT
        menu_item_a_name,
        menu_item_b_name,
        pair_orders,
        support,
        confidence_a_to_b,
        confidence_b_to_a,
        lift_a_to_b,
        lift_b_to_a,
        margin_score,
        base_combo_opportunity_score,
        pair_type_boost_factor,
        pair_type_boost_applied,
        combo_opportunity_score,
        confidence_level,
        pair_type
      FROM marts.vw_combo_opportunity_candidates
      WHERE location_id = ${analyticsData.locationId}
        AND pair_orders >= ${minSampleSize}
        AND (${filters.q} = '' OR menu_item_a_name ILIKE ${searchLike} OR menu_item_b_name ILIKE ${searchLike})
        AND (${filters.pairType}::text = 'all' OR pair_type = ${filters.pairType}::text)
      ORDER BY combo_opportunity_score DESC
      LIMIT ${Math.max(filters.limit, 200)}
    `;
  }

  let effectiveMinSampleSize = filters.minSampleSize;
  let fallbackMinSampleApplied = false;

  let pairRowsRaw = await loadPairRows(effectiveMinSampleSize);
  let comboRowsRaw = await loadComboRows(effectiveMinSampleSize);
  if (pairRowsRaw.length === 0 && comboRowsRaw.length === 0 && effectiveMinSampleSize > 1) {
    effectiveMinSampleSize = 1;
    fallbackMinSampleApplied = true;
    pairRowsRaw = await loadPairRows(effectiveMinSampleSize);
    comboRowsRaw = await loadComboRows(effectiveMinSampleSize);
  }

  const pairs: PairRow[] = pairRowsRaw
    .map((row) => {
      const support = toNumber(row.support);
      const confidenceAtoB = toNumber(row.confidence_a_to_b);
      const confidenceBtoA = toNumber(row.confidence_b_to_a);
      const liftAtoB = toNumber(row.lift_a_to_b);
      const liftBtoA = toNumber(row.lift_b_to_a);
      const score = ((support * 100) + (((confidenceAtoB + confidenceBtoA) / 2) * 100) + (((liftAtoB + liftBtoA) / 2) * 10)) / 3;

      return {
        pairKey: `${row.menu_item_a_name}::${row.menu_item_b_name}`,
        menuA: row.menu_item_a_name,
        menuB: row.menu_item_b_name,
        pairOrders: toNumber(row.pair_orders),
        support,
        confidenceAtoB,
        confidenceBtoA,
        liftAtoB,
        liftBtoA,
        score,
        isNoisy: Boolean(row.is_noisy),
        pairType: row.pair_type,
      };
    })
    .filter((row) => {
      const confidenceAvg = (row.confidenceAtoB + row.confidenceBtoA) / 2;
      const liftAvg = (row.liftAtoB + row.liftBtoA) / 2;
      return confidenceAvg >= filters.minConfidence && liftAvg >= filters.minLift;
    });

  const combos: ComboRow[] = comboRowsRaw
    .map((row) => ({
      pairKey: `${row.menu_item_a_name}::${row.menu_item_b_name}`,
      menuA: row.menu_item_a_name,
      menuB: row.menu_item_b_name,
      pairOrders: toNumber(row.pair_orders),
      support: toNumber(row.support),
      confidenceAtoB: toNumber(row.confidence_a_to_b),
      confidenceBtoA: toNumber(row.confidence_b_to_a),
      liftAtoB: toNumber(row.lift_a_to_b),
      liftBtoA: toNumber(row.lift_b_to_a),
      score: toNumber(row.combo_opportunity_score),
      marginScore: toNumber(row.margin_score),
      confidenceLevel: row.confidence_level,
      pairType: row.pair_type,
      pairTypeBoostFactor: toNumber(row.pair_type_boost_factor),
      pairTypeBoostApplied: Boolean(row.pair_type_boost_applied),
      baseScore: toNumber(row.base_combo_opportunity_score),
    }))
    .filter((row) => {
      const confidenceAvg = (row.confidenceAtoB + row.confidenceBtoA) / 2;
      const liftAvg = (row.liftAtoB + row.liftBtoA) / 2;
      return confidenceAvg >= filters.minConfidence && liftAvg >= filters.minLift;
    });

  const sortedPairs = sortPairRows(pairs, filters.sort, filters.order).slice(0, filters.limit);
  const sortedCombos = sortComboRows(combos, filters.sort, filters.order).slice(0, filters.limit);

  const strongestLift = [...sortedPairs].sort((a, b) => ((b.liftAtoB + b.liftBtoA) / 2) - ((a.liftAtoB + a.liftBtoA) / 2))[0] ?? null;
  const highestVolume = [...sortedPairs].sort((a, b) => b.pairOrders - a.pairOrders)[0] ?? null;
  const bestCombo = [...sortedCombos].sort((a, b) => b.score - a.score)[0] ?? null;

  const analyticsName = analyticsData.sourceFile ?? `Analytics #${analyticsData.id}`;
  const filterQuery = serializePairFilterState(filters).toString();
  const pairExportHref = `/api/exports/analyst?dataset=pairs&locationId=${analyticsData.locationId}&${filterQuery}`;
  const comboExportHref = `/api/exports/analyst?dataset=combos&locationId=${analyticsData.locationId}&${filterQuery}`;

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
        description="Analyze co-purchase behavior and margin-aware combo opportunities with a decision-grade GUI."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="outline">Location #{analyticsData.locationId}</Badge>
        <Badge variant="outline">Orders: {analyticsData.totalOrders ?? "—"}</Badge>
        <Badge variant="outline">Items: {analyticsData.totalItemsSold ?? "—"}</Badge>
        <Badge variant="outline">Quality: {metadata.qualityStatus ?? "unknown"}</Badge>
        <Badge variant={freshnessMinutes !== null && freshnessMinutes <= freshnessSlaMinutes ? "secondary" : "destructive"}>
          Freshness: {freshnessMinutes !== null ? `${freshnessMinutes} min` : "unknown"}
        </Badge>
        {materialization.fallbackApplied ? (
          <Badge variant="secondary">
            using latest valid materialization (#{materialization.resolvedAnalyticsId})
          </Badge>
        ) : null}
        {fallbackMinSampleApplied ? (
          <Badge variant="secondary">
            no rows at sample {">="} {filters.minSampleSize}; showing {">="} {effectiveMinSampleSize}
          </Badge>
        ) : null}
      </div>

      <div className="mb-6">
        <PairsFilterBar filters={filters} />
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border border-border/70 bg-card p-4 shadow-sm">
          <KpiLabelWithTooltip
            label="Top Lift Pair"
            tooltip="Pair with the strongest average lift versus expected co-occurrence baseline. Higher lift indicates a stronger affinity signal."
          />
          <p className="mt-2 text-base font-semibold">
            {strongestLift ? `${strongestLift.menuA} + ${strongestLift.menuB}` : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {strongestLift
              ? `Avg lift ${(((strongestLift.liftAtoB + strongestLift.liftBtoA) / 2)).toFixed(2)}`
              : "No data"}
          </p>
        </div>

        <div className="border border-border/70 bg-card p-4 shadow-sm">
          <KpiLabelWithTooltip
            label="Highest Volume Pair"
            tooltip="Pair with the largest number of shared orders in the selected filtered window. Use this to identify scale and campaign reach."
          />
          <p className="mt-2 text-base font-semibold">
            {highestVolume ? `${highestVolume.menuA} + ${highestVolume.menuB}` : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {highestVolume ? `${highestVolume.pairOrders.toLocaleString("en-US")} shared orders` : "No data"}
          </p>
        </div>

        <div className="border border-border/70 bg-card p-4 shadow-sm">
          <KpiLabelWithTooltip
            label="Best Combo Opportunity"
            tooltip="Pair with the highest combo opportunity score, combining demand strength and margin-aware opportunity into one ranking signal."
          />
          <p className="mt-2 text-base font-semibold">
            {bestCombo ? `${bestCombo.menuA} + ${bestCombo.menuB}` : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {bestCombo ? `Score ${bestCombo.score.toFixed(2)}` : "No data"}
          </p>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={pairExportHref}>Export Pairs CSV</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={comboExportHref}>Export Combos CSV</Link>
        </Button>
      </section>

      <PairsInsightPanels
        pairs={sortedPairs.map((row) => ({ ...row, kind: "pair" as const }))}
        combos={sortedCombos.map((row) => ({ ...row, kind: "combo" as const }))}
      />
    </AnalyticsPageShell>
  );
}
