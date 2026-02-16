import type { MatrixAction, MatrixCategory } from "@/lib/analytics/matrix-row-contract";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type FilterSortKey =
  | "menuItem"
  | "unitsSold"
  | "revenue"
  | "contributionMargin"
  | "marginPct";

type FilterSortOrder = "asc" | "desc";

export type MatrixFilterState = {
  q: string;
  categories: MatrixCategory[];
  actions: MatrixAction[];
  marginMin: number | null;
  marginMax: number | null;
  qtyMin: number | null;
  qtyMax: number | null;
  sort: FilterSortKey;
  order: FilterSortOrder;
};

export const DEFAULT_MATRIX_FILTER_STATE: MatrixFilterState = {
  q: "",
  categories: [],
  actions: [],
  marginMin: null,
  marginMax: null,
  qtyMin: null,
  qtyMax: null,
  sort: "unitsSold",
  order: "desc",
};

function asSearchParams(input: URLSearchParams | SearchParamsRecord): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  const searchParams = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v) searchParams.append(key, v);
      });
      return;
    }
    if (value) searchParams.set(key, value);
  });
  return searchParams;
}

function parseCsv(searchParams: URLSearchParams, key: string): string[] {
  const values = searchParams.getAll(key);
  if (values.length === 0) return [];
  return values
    .flatMap((value) => value.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseNumber(searchParams: URLSearchParams, key: string): number | null {
  const raw = searchParams.get(key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCategories(input: string[]): MatrixCategory[] {
  return input.filter(
    (value): value is MatrixCategory =>
      value === "star" ||
      value === "plow_horse" ||
      value === "puzzle" ||
      value === "low_end",
  );
}

function parseActions(input: string[]): MatrixAction[] {
  return input.filter(
    (value): value is MatrixAction =>
      value === "remove" ||
      value === "reprice" ||
      value === "promote" ||
      value === "keep",
  );
}

function sanitizeRange(
  min: number | null,
  max: number | null,
): { min: number | null; max: number | null } {
  if (min === null || max === null) return { min, max };
  if (min <= max) return { min, max };
  return { min: max, max: min };
}

function parseSort(searchParams: URLSearchParams): FilterSortKey {
  const value = searchParams.get("sort");
  if (
    value === "menuItem" ||
    value === "unitsSold" ||
    value === "revenue" ||
    value === "contributionMargin" ||
    value === "marginPct"
  ) {
    return value;
  }
  return DEFAULT_MATRIX_FILTER_STATE.sort;
}

function parseOrder(searchParams: URLSearchParams): FilterSortOrder {
  const value = searchParams.get("order");
  return value === "asc" || value === "desc"
    ? value
    : DEFAULT_MATRIX_FILTER_STATE.order;
}

export function parseMatrixFilterState(
  input: URLSearchParams | SearchParamsRecord,
): MatrixFilterState {
  const searchParams = asSearchParams(input);

  const marginRange = sanitizeRange(
    parseNumber(searchParams, "marginMin"),
    parseNumber(searchParams, "marginMax"),
  );
  const qtyRange = sanitizeRange(
    parseNumber(searchParams, "qtyMin"),
    parseNumber(searchParams, "qtyMax"),
  );

  return {
    q: (searchParams.get("q") ?? "").trim().slice(0, 100),
    categories: parseCategories(parseCsv(searchParams, "categories")),
    actions: parseActions(parseCsv(searchParams, "actions")),
    marginMin: marginRange.min,
    marginMax: marginRange.max,
    qtyMin: qtyRange.min,
    qtyMax: qtyRange.max,
    sort: parseSort(searchParams),
    order: parseOrder(searchParams),
  };
}

export function serializeMatrixFilterState(
  state: MatrixFilterState,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (state.q) searchParams.set("q", state.q);
  if (state.categories.length > 0) {
    searchParams.set("categories", state.categories.join(","));
  }
  if (state.actions.length > 0) {
    searchParams.set("actions", state.actions.join(","));
  }
  if (state.marginMin !== null) searchParams.set("marginMin", String(state.marginMin));
  if (state.marginMax !== null) searchParams.set("marginMax", String(state.marginMax));
  if (state.qtyMin !== null) searchParams.set("qtyMin", String(state.qtyMin));
  if (state.qtyMax !== null) searchParams.set("qtyMax", String(state.qtyMax));
  if (state.sort !== DEFAULT_MATRIX_FILTER_STATE.sort) {
    searchParams.set("sort", state.sort);
  }
  if (state.order !== DEFAULT_MATRIX_FILTER_STATE.order) {
    searchParams.set("order", state.order);
  }

  return searchParams;
}
