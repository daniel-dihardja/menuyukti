/**
 * Adapter for the matrix page: maps GraphQL menuEngineeringMatrix.items to display
 * rows and groups them by category. Does not depend on matrix-row-contract.
 */

import type { MenuEngineeringMatrixData } from "@/lib/graphql/queries";

export type MatrixCategory = "star" | "plow_horse" | "puzzle" | "low_end";

const CATEGORY_ORDER: MatrixCategory[] = [
  "star",
  "plow_horse",
  "puzzle",
  "low_end",
];

const VALID_CATEGORIES = new Set<string>(CATEGORY_ORDER);

function normalizeCategory(raw: string): MatrixCategory {
  const lower = String(raw ?? "").trim().toLowerCase();
  if (VALID_CATEGORIES.has(lower)) return lower as MatrixCategory;
  return "low_end";
}

const VALID_ACTIONS = new Set(["keep", "promote", "reprice", "remove"]);

function normalizeAction(raw: string): "keep" | "promote" | "reprice" | "remove" | null {
  const lower = String(raw ?? "").trim().toLowerCase();
  return VALID_ACTIONS.has(lower) ? (lower as "keep" | "promote" | "reprice" | "remove") : null;
}

export type MatrixDisplayRow = {
  menuItem: string;
  category: MatrixCategory;
  unitsSold: number;
  revenue: number;
  marginPct: number;
  action: "keep" | "promote" | "reprice" | "remove" | null;
  actionReason?: string;
};

type MatrixItem = NonNullable<
  MenuEngineeringMatrixData["menuEngineeringMatrix"]
>["items"][number];

function toDisplayRow(item: MatrixItem): MatrixDisplayRow {
  const category = normalizeCategory(item.category);
  const marginPct = Number(item.contributionMarginPercentage);
  const marginPctSafe = Number.isFinite(marginPct) && marginPct >= 0 && marginPct <= 1
    ? marginPct
    : 0;
  return {
    menuItem: item.menu?.trim() || "Unknown",
    category,
    unitsSold: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
    revenue: Number.isFinite(Number(item.totalRevenue)) ? Number(item.totalRevenue) : 0,
    marginPct: marginPctSafe,
    action: normalizeAction(item.action),
    actionReason: undefined,
  };
}

export type GroupedByCategory = Record<MatrixCategory, MatrixDisplayRow[]>;

/**
 * Maps menuEngineeringMatrix.items to display rows and groups by category.
 * Returns the four categories in order (Star, Plow Horse, Puzzle, Low End), each
 * with an array of rows (possibly empty).
 */
export function matrixItemsToGroupedRows(
  items: MatrixItem[] | null | undefined,
): GroupedByCategory {
  const grouped: GroupedByCategory = {
    star: [],
    plow_horse: [],
    puzzle: [],
    low_end: [],
  };
  if (!items || !Array.isArray(items)) return grouped;
  for (const item of items) {
    const row = toDisplayRow(item);
    grouped[row.category].push(row);
  }
  return grouped;
}

export { CATEGORY_ORDER };
