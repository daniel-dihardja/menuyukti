import type { MatrixFilterState } from "@/lib/analytics/matrix-filter-state";
import type { DecisionGradeMatrixRow } from "@/lib/analytics/matrix-row-contract";

function compareNullableNumbers(
  a: number | null,
  b: number | null,
  order: "asc" | "desc",
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return order === "asc" ? a - b : b - a;
}

function compareStrings(a: string, b: string, order: "asc" | "desc"): number {
  const cmp = a.localeCompare(b, "en", { sensitivity: "base" });
  return order === "asc" ? cmp : -cmp;
}

function compareNumbers(a: number, b: number, order: "asc" | "desc"): number {
  return order === "asc" ? a - b : b - a;
}

export function applyMatrixFilterState(
  rows: DecisionGradeMatrixRow[],
  filters: MatrixFilterState,
): DecisionGradeMatrixRow[] {
  const q = filters.q.toLowerCase();

  const filtered = rows.filter((row) => {
    const menuMatches = q ? row.menuItem.toLowerCase().includes(q) : true;
    const categoryMatches =
      filters.categories.length === 0 || filters.categories.includes(row.category);
    const actionMatches =
      filters.actions.length === 0 ||
      (row.action !== null && filters.actions.includes(row.action));
    const marginMinMatches =
      filters.marginMin === null || row.marginPct >= filters.marginMin;
    const marginMaxMatches =
      filters.marginMax === null || row.marginPct <= filters.marginMax;
    const qtyMinMatches =
      filters.qtyMin === null || row.unitsSold >= filters.qtyMin;
    const qtyMaxMatches =
      filters.qtyMax === null || row.unitsSold <= filters.qtyMax;

    return (
      menuMatches &&
      categoryMatches &&
      actionMatches &&
      marginMinMatches &&
      marginMaxMatches &&
      qtyMinMatches &&
      qtyMaxMatches
    );
  });

  const withIndex = filtered.map((row, index) => ({ row, index }));
  withIndex.sort((a, b) => {
    switch (filters.sort) {
      case "menuItem": {
        const byName = compareStrings(a.row.menuItem, b.row.menuItem, filters.order);
        if (byName !== 0) return byName;
        break;
      }
      case "unitsSold": {
        const byUnits = compareNumbers(a.row.unitsSold, b.row.unitsSold, filters.order);
        if (byUnits !== 0) return byUnits;
        break;
      }
      case "revenue": {
        const byRevenue = compareNumbers(a.row.revenue, b.row.revenue, filters.order);
        if (byRevenue !== 0) return byRevenue;
        break;
      }
      case "contributionMargin": {
        const byMargin = compareNumbers(
          a.row.contributionMargin,
          b.row.contributionMargin,
          filters.order,
        );
        if (byMargin !== 0) return byMargin;
        break;
      }
      case "marginPct": {
        const byMarginPct = compareNumbers(a.row.marginPct, b.row.marginPct, filters.order);
        if (byMarginPct !== 0) return byMarginPct;
        break;
      }
    }

    const byAction = compareNullableNumbers(
      a.row.action ? ["keep", "promote", "reprice", "remove"].indexOf(a.row.action) : null,
      b.row.action ? ["keep", "promote", "reprice", "remove"].indexOf(b.row.action) : null,
      "asc",
    );
    if (byAction !== 0) return byAction;

    // Stable fallback to preserve deterministic output.
    return a.index - b.index;
  });

  return withIndex.map(({ row }) => row);
}
