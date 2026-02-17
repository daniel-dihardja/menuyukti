export type CogsCompletenessItem = {
  id: number;
  menuName: string;
  cogs: number | null;
  quantity: number;
  totalRevenue: number;
  menuCategory: string | null;
};

export type CogsCompletenessSummary = {
  totalItems: number;
  validCogsItems: number;
  missingOrInvalidItems: number;
  itemCompletenessRatio: number;
  totalRevenue: number;
  coveredRevenue: number;
  revenueCoverageRatio: number;
  prioritizedMissing: Array<{
    id: number;
    menuName: string;
    quantity: number;
    totalRevenue: number;
    menuCategory: string | null;
    issue: "missing" | "invalid";
  }>;
};

function hasValidCogs(cogs: number | null): boolean {
  return typeof cogs === "number" && Number.isFinite(cogs) && cogs > 0;
}

export function cogsIssue(cogs: number | null): "none" | "missing" | "invalid" {
  if (cogs == null) return "missing";
  if (hasValidCogs(cogs)) return "none";
  return "invalid";
}

export type CogsCoverageSummary = {
  totalItems: number;
  validCogsItems: number;
  itemCoverageRatio: number;
  totalRevenue: number;
  coveredRevenue: number;
  revenueCoverageRatio: number;
};

export function summarizeCogsCoverage(
  rows: Array<{ cogs: number | null; revenue: number }>,
): CogsCoverageSummary {
  const totalItems = rows.length;
  const validRows = rows.filter((row) => hasValidCogs(row.cogs));
  const validCogsItems = validRows.length;
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const coveredRevenue = validRows.reduce((sum, row) => sum + row.revenue, 0);

  return {
    totalItems,
    validCogsItems,
    itemCoverageRatio: totalItems > 0 ? validCogsItems / totalItems : 0,
    totalRevenue,
    coveredRevenue,
    revenueCoverageRatio: totalRevenue > 0 ? coveredRevenue / totalRevenue : 0,
  };
}

export function summarizeCogsCompleteness(
  items: CogsCompletenessItem[],
  topMissingLimit = 10,
): CogsCompletenessSummary {
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;

  const validItems = safeItems.filter((item) => hasValidCogs(item.cogs));
  const validCogsItems = validItems.length;
  const missingOrInvalidItems = totalItems - validCogsItems;

  const totalRevenue = safeItems.reduce((sum, item) => sum + item.totalRevenue, 0);
  const coveredRevenue = validItems.reduce((sum, item) => sum + item.totalRevenue, 0);

  const itemCompletenessRatio = totalItems > 0 ? validCogsItems / totalItems : 0;
  const revenueCoverageRatio = totalRevenue > 0 ? coveredRevenue / totalRevenue : 0;

  const prioritizedMissing = safeItems
    .filter((item) => !hasValidCogs(item.cogs))
    .map((item) => ({
      id: item.id,
      menuName: item.menuName,
      quantity: item.quantity,
      totalRevenue: item.totalRevenue,
      menuCategory: item.menuCategory,
      issue: item.cogs == null ? ("missing" as const) : ("invalid" as const),
    }))
    .sort((a, b) => {
      if (a.totalRevenue !== b.totalRevenue) return b.totalRevenue - a.totalRevenue;
      if (a.quantity !== b.quantity) return b.quantity - a.quantity;
      return a.menuName.localeCompare(b.menuName);
    })
    .slice(0, Math.max(0, topMissingLimit));

  return {
    totalItems,
    validCogsItems,
    missingOrInvalidItems,
    itemCompletenessRatio,
    totalRevenue,
    coveredRevenue,
    revenueCoverageRatio,
    prioritizedMissing,
  };
}
