export type MatrixCategory = "star" | "plow_horse" | "puzzle" | "low_end";

export type MatrixAction = "remove" | "reprice" | "promote" | "keep";

type MatrixThresholdsUsed = {
  avg_popularity?: unknown;
  avg_contribution_margin?: unknown;
};

type RawMatrixItem = {
  menu?: unknown;
  category?: unknown;
  quantity?: unknown;
  total_revenue?: unknown;
  cogs?: unknown;
  contribution_margin?: unknown;
  contribution_margin_percentage?: unknown;
  action?: unknown;
  reason_code?: unknown;
  action_reason?: unknown;
  popularity_score?: unknown;
  margin_score?: unknown;
  thresholds_used?: MatrixThresholdsUsed | null;
};

export type DecisionGradeMatrixRow = {
  menuItem: string;
  category: MatrixCategory;
  unitsSold: number;
  revenue: number;
  cogs: number | null;
  contributionMargin: number;
  marginPct: number;
  action: MatrixAction | null;
  actionReason: string;
  reasonCode: string | null;
  popularityScore: number | null;
  marginScore: number | null;
  thresholdsUsed: {
    avgPopularity: number | null;
    avgContributionMargin: number | null;
  };
};

const DEFAULT_REASON_BY_ACTION: Record<MatrixAction, string> = {
  keep: "Strong baseline performance; keep and monitor.",
  promote: "High margin opportunity with lower popularity; promote to grow sales.",
  reprice: "Popular item with weaker margin; review pricing, portion, or COGS.",
  remove: "Low demand and low margin; consider removing or redesigning.",
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function asAction(value: unknown): MatrixAction | null {
  if (
    value === "remove" ||
    value === "reprice" ||
    value === "promote" ||
    value === "keep"
  ) {
    return value;
  }
  return null;
}

function asCategory(value: unknown): MatrixCategory {
  if (
    value === "star" ||
    value === "plow_horse" ||
    value === "puzzle" ||
    value === "low_end"
  ) {
    return value;
  }
  return "low_end";
}

function humanizeReasonCode(reasonCode: string): string {
  return reasonCode
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveActionReason(item: RawMatrixItem, action: MatrixAction | null): string {
  if (typeof item.action_reason === "string" && item.action_reason.trim()) {
    return item.action_reason.trim();
  }

  if (typeof item.reason_code === "string" && item.reason_code.trim()) {
    return humanizeReasonCode(item.reason_code.trim());
  }

  if (action) return DEFAULT_REASON_BY_ACTION[action];
  return "Recommendation unavailable; review volume and margin signals.";
}

export function toDecisionGradeMatrixRows(input: unknown): DecisionGradeMatrixRow[] {
  const maybeItems = (input as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(maybeItems)) return [];

  return maybeItems.map((row, idx) => {
    const item = (row ?? {}) as RawMatrixItem;

    const unitsSold = Math.max(0, Math.round(toFiniteNumber(item.quantity) ?? 0));
    const revenue = roundTo(Math.max(0, toFiniteNumber(item.total_revenue) ?? 0), 2);
    const cogsNumber = toFiniteNumber(item.cogs);
    const cogs = cogsNumber === null ? null : roundTo(Math.max(0, cogsNumber), 2);
    const contributionMargin = roundTo(
      Math.max(0, toFiniteNumber(item.contribution_margin) ?? 0),
      2,
    );
    const marginPct = roundTo(
      Math.max(0, Math.min(1, toFiniteNumber(item.contribution_margin_percentage) ?? 0)),
      4,
    );
    const action = asAction(item.action);
    const reasonCode =
      typeof item.reason_code === "string" && item.reason_code.trim()
        ? item.reason_code.trim()
        : null;

    return {
      menuItem:
        typeof item.menu === "string" && item.menu.trim()
          ? item.menu.trim()
          : `Unknown Item ${idx + 1}`,
      category: asCategory(item.category),
      unitsSold,
      revenue,
      cogs,
      contributionMargin,
      marginPct,
      action,
      actionReason: resolveActionReason(item, action),
      reasonCode,
      popularityScore: toFiniteNumber(item.popularity_score),
      marginScore: toFiniteNumber(item.margin_score),
      thresholdsUsed: {
        avgPopularity: toFiniteNumber(item.thresholds_used?.avg_popularity),
        avgContributionMargin: toFiniteNumber(
          item.thresholds_used?.avg_contribution_margin,
        ),
      },
    };
  });
}
