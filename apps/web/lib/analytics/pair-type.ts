export type PairType = "food_food" | "food_drink" | "drink_drink" | "unknown";
export type PairTypeFilter = "all" | PairType;

export const PAIR_TYPE_OPTIONS: PairTypeFilter[] = [
  "all",
  "food_drink",
  "food_food",
  "drink_drink",
  "unknown",
];

export function parsePairTypeFilter(raw: string | null | undefined): PairTypeFilter {
  if (!raw) return "all";
  if (
    raw === "all" ||
    raw === "food_drink" ||
    raw === "food_food" ||
    raw === "drink_drink" ||
    raw === "unknown"
  ) {
    return raw;
  }
  return "all";
}

export function pairTypeLabel(value: PairType): string {
  if (value === "food_drink") return "Food + Drink";
  if (value === "food_food") return "Food + Food";
  if (value === "drink_drink") return "Drink + Drink";
  return "Unknown";
}
