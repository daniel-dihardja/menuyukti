import {
  DEFAULT_MATRIX_FILTER_STATE,
  type MatrixFilterState,
} from "@/lib/analytics/matrix-filter-state";

export type MatrixPresetKey =
  | "push_winners"
  | "fix_pricing"
  | "review_low_margin"
  | "underperformers";

type MatrixPresetDefinition = {
  key: MatrixPresetKey;
  label: string;
  description: string;
  state: MatrixFilterState;
};

const PRESET_DEFINITIONS: Record<MatrixPresetKey, MatrixPresetDefinition> = {
  push_winners: {
    key: "push_winners",
    label: "Push Winners",
    description: "Focus on high-margin items with strong or emerging demand.",
    state: {
      ...DEFAULT_MATRIX_FILTER_STATE,
      categories: ["star", "puzzle"],
      actions: ["promote", "keep"],
      marginMin: 0.45,
      qtyMin: 20,
      sort: "revenue",
      order: "desc",
    },
  },
  fix_pricing: {
    key: "fix_pricing",
    label: "Fix Pricing",
    description: "Find popular items with weaker margin needing pricing or COGS updates.",
    state: {
      ...DEFAULT_MATRIX_FILTER_STATE,
      categories: ["plow_horse", "puzzle"],
      actions: ["reprice"],
      marginMax: 0.5,
      qtyMin: 10,
      sort: "marginPct",
      order: "asc",
    },
  },
  review_low_margin: {
    key: "review_low_margin",
    label: "Review Low Margin",
    description: "Inspect low-margin items first for rapid profitability gains.",
    state: {
      ...DEFAULT_MATRIX_FILTER_STATE,
      marginMax: 0.35,
      qtyMin: 10,
      sort: "marginPct",
      order: "asc",
    },
  },
  underperformers: {
    key: "underperformers",
    label: "Underperformers",
    description: "Review low-demand and low-margin items for removal or redesign.",
    state: {
      ...DEFAULT_MATRIX_FILTER_STATE,
      categories: ["low_end"],
      actions: ["remove"],
      marginMax: 0.35,
      qtyMax: 20,
      sort: "unitsSold",
      order: "asc",
    },
  },
};

export function getMatrixPresetDefinition(
  preset: MatrixPresetKey,
): MatrixPresetDefinition {
  return PRESET_DEFINITIONS[preset];
}

export function getMatrixFilterPresets(): MatrixPresetDefinition[] {
  return Object.values(PRESET_DEFINITIONS);
}
