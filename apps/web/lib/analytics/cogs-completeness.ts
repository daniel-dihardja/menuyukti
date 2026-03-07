export type CogsCompletenessSummary = {
  totalItems: number;
  validCogsItems: number;
  itemCompletenessRatio: number;
  revenueCoverageRatio: number;
  prioritizedMissing: Array<{
    id: number;
    menuName: string;
    quantity: number;
    totalRevenue: number;
    issue: string;
  }>;
};

type MenuItemInput = {
  id: number;
  menuName: string;
  cogs: number | null;
  quantity: number;
  totalRevenue: number;
  menuCategory: string | null;
};

function hasValidCogs(cogs: number | null): boolean {
  return cogs != null && Number.isFinite(cogs) && cogs >= 0;
}

export function summarizeCogsCompleteness(
  menuItems: MenuItemInput[],
): CogsCompletenessSummary {
  const totalItems = menuItems.length;
  const withCogs = menuItems.filter((item) => hasValidCogs(item.cogs));
  const validCogsItems = withCogs.length;
  const itemCompletenessRatio =
    totalItems === 0 ? 0 : validCogsItems / totalItems;

  const totalRevenue = menuItems.reduce((s, i) => s + i.totalRevenue, 0);
  const revenueWithCogs = withCogs.reduce((s, i) => s + i.totalRevenue, 0);
  const revenueCoverageRatio =
    totalRevenue === 0 ? 0 : revenueWithCogs / totalRevenue;

  const missing = menuItems
    .filter((item) => !hasValidCogs(item.cogs))
    .map((item) => ({
      id: item.id,
      menuName: item.menuName,
      quantity: item.quantity,
      totalRevenue: item.totalRevenue,
      issue: "Missing COGS",
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    totalItems,
    validCogsItems,
    itemCompletenessRatio,
    revenueCoverageRatio,
    prioritizedMissing: missing,
  };
}
