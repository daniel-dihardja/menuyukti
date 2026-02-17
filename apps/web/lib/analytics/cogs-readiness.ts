import type { CogsCoverageSummary } from "@/lib/analytics/cogs-completeness";

export type CogsReadiness = "ready" | "degraded" | "blocked";

export type CogsReadinessReason =
  | "low_cogs_item_coverage"
  | "low_cogs_revenue_coverage";

export type CogsReadinessThresholds = {
  itemWarn: number;
  itemBlock: number;
  revenueWarn: number;
  revenueBlock: number;
};

export type CogsReadinessResult = {
  readiness: CogsReadiness;
  reasons: CogsReadinessReason[];
  thresholds: CogsReadinessThresholds;
};

function parseThreshold(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

export function resolveCogsReadinessThresholds(): CogsReadinessThresholds {
  const itemWarn = parseThreshold(process.env.COGS_ITEM_COVERAGE_WARN_THRESHOLD, 0.8);
  const itemBlock = parseThreshold(process.env.COGS_ITEM_COVERAGE_BLOCK_THRESHOLD, 0.5);
  const revenueWarn = parseThreshold(process.env.COGS_REVENUE_COVERAGE_WARN_THRESHOLD, 0.85);
  const revenueBlock = parseThreshold(process.env.COGS_REVENUE_COVERAGE_BLOCK_THRESHOLD, 0.6);

  return {
    itemWarn: Math.max(itemWarn, itemBlock),
    itemBlock,
    revenueWarn: Math.max(revenueWarn, revenueBlock),
    revenueBlock,
  };
}

export function evaluateCogsReadiness(
  coverage: CogsCoverageSummary,
  thresholds = resolveCogsReadinessThresholds(),
): CogsReadinessResult {
  const reasons: CogsReadinessReason[] = [];

  if (coverage.itemCoverageRatio < thresholds.itemWarn) {
    reasons.push("low_cogs_item_coverage");
  }
  if (coverage.revenueCoverageRatio < thresholds.revenueWarn) {
    reasons.push("low_cogs_revenue_coverage");
  }

  const blocked =
    coverage.itemCoverageRatio < thresholds.itemBlock ||
    coverage.revenueCoverageRatio < thresholds.revenueBlock;

  return {
    readiness: blocked ? "blocked" : reasons.length > 0 ? "degraded" : "ready",
    reasons,
    thresholds,
  };
}
