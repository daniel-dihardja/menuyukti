type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type PairSortKey =
  | "comboScore"
  | "lift"
  | "pairOrders"
  | "support"
  | "confidence";

export type PairSortOrder = "asc" | "desc";

export type PairFilterState = {
  q: string;
  minSampleSize: number;
  minLift: number;
  minConfidence: number;
  limit: number;
  sort: PairSortKey;
  order: PairSortOrder;
};

export const DEFAULT_PAIR_FILTER_STATE: PairFilterState = {
  q: "",
  minSampleSize: 5,
  minLift: 1,
  minConfidence: 0,
  limit: 100,
  sort: "comboScore",
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

function parseNumber(
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
): number {
  const raw = searchParams.get(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseSort(searchParams: URLSearchParams): PairSortKey {
  const value = searchParams.get("sort");
  if (
    value === "comboScore" ||
    value === "lift" ||
    value === "pairOrders" ||
    value === "support" ||
    value === "confidence"
  ) {
    return value;
  }
  return DEFAULT_PAIR_FILTER_STATE.sort;
}

function parseOrder(searchParams: URLSearchParams): PairSortOrder {
  const value = searchParams.get("order");
  return value === "asc" || value === "desc"
    ? value
    : DEFAULT_PAIR_FILTER_STATE.order;
}

export function parsePairFilterState(
  input: URLSearchParams | SearchParamsRecord,
): PairFilterState {
  const searchParams = asSearchParams(input);

  return {
    q: (searchParams.get("q") ?? "").trim().slice(0, 100),
    minSampleSize: clamp(
      Math.round(
        parseNumber(
          searchParams,
          "minSampleSize",
          DEFAULT_PAIR_FILTER_STATE.minSampleSize,
        ),
      ),
      1,
      1000,
    ),
    minLift: clamp(
      parseNumber(searchParams, "minLift", DEFAULT_PAIR_FILTER_STATE.minLift),
      0,
      100,
    ),
    minConfidence: clamp(
      parseNumber(
        searchParams,
        "minConfidence",
        DEFAULT_PAIR_FILTER_STATE.minConfidence,
      ),
      0,
      1,
    ),
    limit: clamp(
      Math.round(
        parseNumber(searchParams, "limit", DEFAULT_PAIR_FILTER_STATE.limit),
      ),
      10,
      1000,
    ),
    sort: parseSort(searchParams),
    order: parseOrder(searchParams),
  };
}

export function serializePairFilterState(state: PairFilterState): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (state.q) searchParams.set("q", state.q);
  if (state.minSampleSize !== DEFAULT_PAIR_FILTER_STATE.minSampleSize) {
    searchParams.set("minSampleSize", String(state.minSampleSize));
  }
  if (state.minLift !== DEFAULT_PAIR_FILTER_STATE.minLift) {
    searchParams.set("minLift", String(state.minLift));
  }
  if (state.minConfidence !== DEFAULT_PAIR_FILTER_STATE.minConfidence) {
    searchParams.set("minConfidence", String(state.minConfidence));
  }
  if (state.limit !== DEFAULT_PAIR_FILTER_STATE.limit) {
    searchParams.set("limit", String(state.limit));
  }
  if (state.sort !== DEFAULT_PAIR_FILTER_STATE.sort) {
    searchParams.set("sort", state.sort);
  }
  if (state.order !== DEFAULT_PAIR_FILTER_STATE.order) {
    searchParams.set("order", state.order);
  }

  return searchParams;
}
