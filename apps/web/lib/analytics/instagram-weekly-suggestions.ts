import { toDecisionGradeMatrixRows } from "@/lib/analytics/matrix-row-contract";

export type InstagramWeeklySuggestion = {
  rank: number;
  menuItem: string;
  canonicalMenuNameNorm: string;
  suggestedFor: string;
  suggestedDaypart: "morning" | "lunch" | "afternoon" | "evening";
  offerType: "combo_offer" | "happy_hour" | "hero_item";
  rationale: string;
  confidence: "high" | "medium" | "low";
  sourceSignals: {
    heatmapTotalQty: number;
    heatmapDaypartQty: number;
    matrixAction: "promote" | "reprice" | "keep" | "remove" | "none";
    matrixMarginPct: number | null;
  };
};

type HeatmapPoint = {
  hour: number;
  quantity: number;
};

type HeatmapMenuSummary = {
  menuItem: string;
  totalQty: number;
  morningQty: number;
  lunchQty: number;
  afternoonQty: number;
  eveningQty: number;
};

type MatrixAction = "promote" | "reprice" | "keep" | "remove" | "none";

function normalizeMenuName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseHour(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(23, Math.round(raw)));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const hours = Number(trimmed.split(":")[0]);
    if (!Number.isFinite(hours)) return null;
    return Math.max(0, Math.min(23, Math.round(hours)));
  }
  return null;
}

function parseQuantity(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function toDaypart(hour: number): "morning" | "lunch" | "afternoon" | "evening" {
  if (hour <= 10) return "morning";
  if (hour <= 14) return "lunch";
  if (hour <= 17) return "afternoon";
  return "evening";
}

function summarizeHeatmapByMenu(heatmapJson: unknown): HeatmapMenuSummary[] {
  if (!Array.isArray(heatmapJson)) return [];

  const summaries: HeatmapMenuSummary[] = [];
  for (const raw of heatmapJson) {
    const item = raw as {
      menu?: unknown;
      dailyHeatmap?: Array<{ hour: unknown; quantity: unknown }>;
      daily_heatmap?: Array<{ hour: unknown; quantity: unknown }>;
    };

    const menuItem = typeof item.menu === "string" ? item.menu.trim() : "";
    if (!menuItem) continue;

    const pointsRaw = item.dailyHeatmap ?? item.daily_heatmap ?? [];
    const points: HeatmapPoint[] = Array.isArray(pointsRaw)
      ? pointsRaw
          .map((point) => {
            const hour = parseHour(point.hour);
            if (hour === null) return null;
            return {
              hour,
              quantity: parseQuantity(point.quantity),
            };
          })
          .filter((point): point is HeatmapPoint => point !== null)
      : [];

    if (points.length === 0) continue;

    const summary: HeatmapMenuSummary = {
      menuItem,
      totalQty: 0,
      morningQty: 0,
      lunchQty: 0,
      afternoonQty: 0,
      eveningQty: 0,
    };

    for (const point of points) {
      summary.totalQty += point.quantity;
      const daypart = toDaypart(point.hour);
      if (daypart === "morning") summary.morningQty += point.quantity;
      if (daypart === "lunch") summary.lunchQty += point.quantity;
      if (daypart === "afternoon") summary.afternoonQty += point.quantity;
      if (daypart === "evening") summary.eveningQty += point.quantity;
    }

    summaries.push(summary);
  }

  return summaries;
}

function bestDaypart(summary: HeatmapMenuSummary): {
  daypart: "morning" | "lunch" | "afternoon" | "evening";
  qty: number;
} {
  const dayparts = [
    { daypart: "morning", qty: summary.morningQty },
    { daypart: "lunch", qty: summary.lunchQty },
    { daypart: "afternoon", qty: summary.afternoonQty },
    { daypart: "evening", qty: summary.eveningQty },
  ] as const;

  return [...dayparts].sort((a, b) => b.qty - a.qty || a.daypart.localeCompare(b.daypart))[0] ?? {
    daypart: "lunch",
    qty: 0,
  };
}

function offerTypeFromMatrixAction(action: MatrixAction) {
  if (action === "promote") return "combo_offer" as const;
  if (action === "reprice") return "happy_hour" as const;
  return "hero_item" as const;
}

function confidenceFromSignals(totalQty: number, marginPct: number | null): "high" | "medium" | "low" {
  if (totalQty >= 100 && marginPct !== null && marginPct >= 0.45) return "high";
  if (totalQty >= 40) return "medium";
  return "low";
}

function dayOffsetForRank(rank: number): number {
  return rank % 7;
}

function hourForDaypart(daypart: "morning" | "lunch" | "afternoon" | "evening"): number {
  if (daypart === "morning") return 9;
  if (daypart === "lunch") return 12;
  if (daypart === "afternoon") return 16;
  return 19;
}

function computeSuggestedFor(weekStartDate: Date, rank: number, daypart: "morning" | "lunch" | "afternoon" | "evening"): string {
  const d = new Date(Date.UTC(weekStartDate.getUTCFullYear(), weekStartDate.getUTCMonth(), weekStartDate.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + dayOffsetForRank(rank));
  d.setUTCHours(hourForDaypart(daypart), 0, 0, 0);
  return d.toISOString();
}

export function buildWeeklyInstagramSuggestions(input: {
  heatmapJson: unknown;
  matrixJson: unknown;
  weekStartDate: Date;
  limit?: number;
}): InstagramWeeklySuggestion[] {
  const limit = Math.max(1, Math.min(24, input.limit ?? 7));
  const heatmapSummaries = summarizeHeatmapByMenu(input.heatmapJson);
  if (heatmapSummaries.length === 0) return [];

  const matrixByMenu = new Map(
    toDecisionGradeMatrixRows(input.matrixJson).map((row) => [normalizeMenuName(row.menuItem), row]),
  );

  return heatmapSummaries
    .map((summary) => {
      const daypart = bestDaypart(summary);
      const matrix = matrixByMenu.get(normalizeMenuName(summary.menuItem));
      const matrixAction: MatrixAction = matrix?.action ?? "none";
      const matrixMarginPct = matrix?.marginPct ?? null;
      const score = summary.totalQty * 100 + daypart.qty * 10 + (matrixMarginPct ?? 0) * 100;

      return {
        summary,
        daypart,
        matrixAction,
        matrixMarginPct,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.summary.menuItem.localeCompare(b.summary.menuItem))
    .slice(0, limit)
    .map((candidate, index) => {
      const rank = index + 1;
      const offerType = offerTypeFromMatrixAction(candidate.matrixAction);
      const confidence = confidenceFromSignals(candidate.summary.totalQty, candidate.matrixMarginPct);

      return {
        rank,
        menuItem: candidate.summary.menuItem,
        canonicalMenuNameNorm: normalizeMenuName(candidate.summary.menuItem),
        suggestedFor: computeSuggestedFor(input.weekStartDate, index, candidate.daypart.daypart),
        suggestedDaypart: candidate.daypart.daypart,
        offerType,
        rationale: `Heatmap shows strong ${candidate.daypart.daypart} demand (${candidate.daypart.qty.toFixed(0)} qty) for ${candidate.summary.menuItem}.`,
        confidence,
        sourceSignals: {
          heatmapTotalQty: Number(candidate.summary.totalQty.toFixed(2)),
          heatmapDaypartQty: Number(candidate.daypart.qty.toFixed(2)),
          matrixAction: candidate.matrixAction,
          matrixMarginPct: candidate.matrixMarginPct,
        },
      };
    });
}
