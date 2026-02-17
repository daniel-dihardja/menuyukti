import type { HeatmapMatrixRow } from "@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap.adapters";

export type HeatmapSegment = "all" | "weekday" | "weekend";
export type HeatmapSort = "total" | "window";
export type HeatmapOrder = "asc" | "desc";
export type HeatmapDensity = "comfortable" | "compact";

export type HeatmapFilterState = {
  q: string;
  top: number;
  segment: HeatmapSegment;
  sort: HeatmapSort;
  sortWindow: string;
  order: HeatmapOrder;
  density: HeatmapDensity;
};

export const DEFAULT_HEATMAP_FILTER_STATE: HeatmapFilterState = {
  q: "",
  top: 20,
  segment: "all",
  sort: "total",
  sortWindow: "",
  order: "desc",
  density: "comfortable",
};

function toNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstValue(raw: string | string[] | undefined): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
}

export function parseHeatmapFilterState(
  searchParams: Record<string, string | string[] | undefined>,
): HeatmapFilterState {
  const q = firstValue(searchParams.q)?.trim() ?? DEFAULT_HEATMAP_FILTER_STATE.q;
  const topRaw = toNumber(firstValue(searchParams.top), DEFAULT_HEATMAP_FILTER_STATE.top);
  const top = Math.max(1, Math.min(200, Math.round(topRaw)));

  const segmentRaw = firstValue(searchParams.segment);
  const segment: HeatmapSegment =
    segmentRaw === "weekday" || segmentRaw === "weekend" ? segmentRaw : DEFAULT_HEATMAP_FILTER_STATE.segment;

  const sortRaw = firstValue(searchParams.sort);
  const sort: HeatmapSort = sortRaw === "window" ? "window" : DEFAULT_HEATMAP_FILTER_STATE.sort;

  const orderRaw = firstValue(searchParams.order);
  const order: HeatmapOrder = orderRaw === "asc" ? "asc" : DEFAULT_HEATMAP_FILTER_STATE.order;

  const sortWindow = firstValue(searchParams.sortWindow) ?? DEFAULT_HEATMAP_FILTER_STATE.sortWindow;
  const densityRaw = firstValue(searchParams.density);
  const density: HeatmapDensity = densityRaw === "compact" ? "compact" : DEFAULT_HEATMAP_FILTER_STATE.density;

  return {
    q,
    top,
    segment,
    sort,
    sortWindow,
    order,
    density,
  };
}

export function serializeHeatmapFilterState(state: HeatmapFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.top !== DEFAULT_HEATMAP_FILTER_STATE.top) params.set("top", String(state.top));
  if (state.segment !== DEFAULT_HEATMAP_FILTER_STATE.segment) params.set("segment", state.segment);
  if (state.sort !== DEFAULT_HEATMAP_FILTER_STATE.sort) params.set("sort", state.sort);
  if (state.sortWindow) params.set("sortWindow", state.sortWindow);
  if (state.order !== DEFAULT_HEATMAP_FILTER_STATE.order) params.set("order", state.order);
  if (state.density !== DEFAULT_HEATMAP_FILTER_STATE.density) params.set("density", state.density);
  return params;
}

function rowTotal(row: HeatmapMatrixRow): number {
  return row.values.reduce((acc, value) => acc + value, 0);
}

export function applyHeatmapFilterState(
  rows: HeatmapMatrixRow[],
  labels: string[],
  state: HeatmapFilterState,
): HeatmapMatrixRow[] {
  const query = state.q.trim().toLowerCase();

  const filtered = rows.filter((row) =>
    query.length === 0 ? true : row.label.toLowerCase().includes(query),
  );

  const direction = state.order === "asc" ? 1 : -1;
  const sortWindowIndex = labels.indexOf(state.sortWindow);

  const sorted = [...filtered].sort((a, b) => {
    const aScore =
      state.sort === "window" && sortWindowIndex >= 0
        ? a.values[sortWindowIndex] ?? 0
        : rowTotal(a);
    const bScore =
      state.sort === "window" && sortWindowIndex >= 0
        ? b.values[sortWindowIndex] ?? 0
        : rowTotal(b);
    const diff = (aScore - bScore) * direction;
    if (diff !== 0) return diff;
    return a.label.localeCompare(b.label) * direction;
  });

  return sorted.slice(0, state.top);
}

export function applyWeeklySegment(
  rows: HeatmapMatrixRow[],
  labels: string[],
  segment: HeatmapSegment,
): { rows: HeatmapMatrixRow[]; labels: string[] } {
  if (segment === "all") return { rows, labels };

  const isWeekendLabel = (label: string) => label.toLowerCase().startsWith("sat") || label.toLowerCase().startsWith("sun");

  const keepIndices = labels
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => (segment === "weekend" ? isWeekendLabel(label) : !isWeekendLabel(label)))
    .map(({ index }) => index);

  const nextLabels = keepIndices.map((index) => labels[index] ?? "");
  const nextRows = rows.map((row) => ({
    ...row,
    values: keepIndices.map((index) => row.values[index] ?? 0),
  }));

  return { rows: nextRows, labels: nextLabels };
}
