import type { HeatmapMatrixRow } from "@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap.adapters";

type PeakWindowInsight = {
  label: string;
  totalQty: number;
};

type MenuFocusInsight = {
  menu: string;
  qty: number;
};

export type HeatmapMarketerInsights = {
  peakWindow: PeakWindowInsight | null;
  weakWindow: PeakWindowInsight | null;
  menuFocusAtPeak: MenuFocusInsight | null;
  suggestedAction: string;
};

export type HeatmapAnalystInsights = {
  underperformingWindow: PeakWindowInsight | null;
  concentrationRisk: {
    menu: string;
    share: number;
  } | null;
  weekdayWeekendBias: "weekday" | "weekend" | "balanced";
  suggestedAction: string;
};

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function columnTotals(rows: HeatmapMatrixRow[], columnCount: number): number[] {
  return Array.from({ length: columnCount }, (_, index) =>
    rows.reduce((acc, row) => acc + (row.values[index] ?? 0), 0),
  );
}

function bestMenuAtColumn(rows: HeatmapMatrixRow[], columnIndex: number): MenuFocusInsight | null {
  const ranked = rows
    .map((row) => ({
      menu: row.label,
      qty: row.values[columnIndex] ?? 0,
    }))
    .sort((a, b) => b.qty - a.qty);
  const top = ranked[0];
  if (!top || top.qty <= 0) return null;
  return top;
}

function strongestMenuOverall(rows: HeatmapMatrixRow[]): { menu: string; qty: number } | null {
  const ranked = rows
    .map((row) => ({ menu: row.label, qty: sum(row.values) }))
    .sort((a, b) => b.qty - a.qty);
  const top = ranked[0];
  if (!top || top.qty <= 0) return null;
  return top;
}

export function deriveHeatmapMarketerInsights(
  dailyRows: HeatmapMatrixRow[],
  dailyLabels: string[],
): HeatmapMarketerInsights {
  if (dailyRows.length === 0 || dailyLabels.length === 0) {
    return {
      peakWindow: null,
      weakWindow: null,
      menuFocusAtPeak: null,
      suggestedAction: "No heatmap data available. Upload or refresh analytics first.",
    };
  }

  const totals = columnTotals(dailyRows, dailyLabels.length);
  const ranked = totals
    .map((totalQty, index) => ({
      label: dailyLabels[index] ?? `slot-${index + 1}`,
      totalQty,
      index,
    }))
    .sort((a, b) => b.totalQty - a.totalQty);

  const peak = ranked[0] ?? null;
  const weak = ranked[ranked.length - 1] ?? null;
  const menuFocusAtPeak = peak ? bestMenuAtColumn(dailyRows, peak.index) : null;

  const suggestedAction = peak
    ? `Prioritize posting around ${peak.label} and anchor creative on ${menuFocusAtPeak?.menu ?? "top-demand menu items"}.`
    : "No peak window detected from current data.";

  return {
    peakWindow: peak ? { label: peak.label, totalQty: peak.totalQty } : null,
    weakWindow: weak ? { label: weak.label, totalQty: weak.totalQty } : null,
    menuFocusAtPeak,
    suggestedAction,
  };
}

export function deriveHeatmapAnalystInsights(
  dailyRows: HeatmapMatrixRow[],
  dailyLabels: string[],
  weeklyRows: HeatmapMatrixRow[],
  weeklyLabels: string[],
): HeatmapAnalystInsights {
  const marketer = deriveHeatmapMarketerInsights(dailyRows, dailyLabels);
  const underperformingWindow = marketer.weakWindow;

  const strongestMenu = strongestMenuOverall(dailyRows);
  const totalDemand = sum(dailyRows.map((row) => sum(row.values)));
  const concentrationRisk =
    strongestMenu && totalDemand > 0
      ? {
          menu: strongestMenu.menu,
          share: strongestMenu.qty / totalDemand,
        }
      : null;

  let weekdayWeekendBias: "weekday" | "weekend" | "balanced" = "balanced";
  if (weeklyRows.length > 0 && weeklyLabels.length > 0) {
    const totals = columnTotals(weeklyRows, weeklyLabels.length);
    const weekdayTotal = sum(totals.slice(0, 5));
    const weekendTotal = sum(totals.slice(5));
    const avgWeekday = weekdayTotal / 5;
    const avgWeekend = weekendTotal / 2;
    if (avgWeekday > avgWeekend * 1.1) weekdayWeekendBias = "weekday";
    else if (avgWeekend > avgWeekday * 1.1) weekdayWeekendBias = "weekend";
  }

  const suggestedAction =
    underperformingWindow && concentrationRisk
      ? `Test targeted offers in ${underperformingWindow.label} and reduce over-dependence on ${concentrationRisk.menu}.`
      : "Review low-demand windows and diversify demand across menu items.";

  return {
    underperformingWindow,
    concentrationRisk,
    weekdayWeekendBias,
    suggestedAction,
  };
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function avgDemandPerRow(rows: HeatmapMatrixRow[]): number {
  if (rows.length === 0) return 0;
  return average(rows.map((row) => sum(row.values)));
}
