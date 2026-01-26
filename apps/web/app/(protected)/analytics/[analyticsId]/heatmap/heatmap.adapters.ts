/* ==================================================
 * Backend input types (JSON shape)
 * ================================================== */

export type DailyHeatmapInput = {
  menu: string;
  dailyHeatmap: { hour: string; quantity: number }[];
};

export type WeeklyHeatmapInput = {
  menu: string;
  weeklyHeatmap: { day: string; quantity: number }[];
};

/* ==================================================
 * Shared matrix output types
 * ================================================== */

export type HeatmapMatrixRow = {
  key: string;
  label: string;
  values: number[];
};

export type HeatmapMatrixResult = {
  rows: HeatmapMatrixRow[];
  columnLabels: string[];
};

/* ==================================================
 * DAILY adapter (hour-based)
 * ================================================== */

export function adaptDailyHeatmapMatrix(
  items: DailyHeatmapInput[],
  startHour = 0,
  endHour = 23,
): HeatmapMatrixResult {
  const HOURS: string[] = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => String(startHour + i).padStart(2, "0"),
  );

  const rows: HeatmapMatrixRow[] = items.map((item) => {
    const byHour: Record<string, number> = Object.fromEntries(
      item.dailyHeatmap.map((h) => [h.hour, h.quantity]),
    );

    return {
      key: item.menu,
      label: item.menu,
      values: HOURS.map((h) => byHour[h] ?? 0),
    };
  });

  const columnLabels: string[] = HOURS.map((h) => `${h}:00`);

  return { rows, columnLabels };
}

/* ==================================================
 * WEEKLY adapter (day-based)
 * ================================================== */

export function adaptWeeklyHeatmapMatrix(
  items: WeeklyHeatmapInput[],
): HeatmapMatrixResult {
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };

  const rows: HeatmapMatrixRow[] = items.map((item) => {
    const byDay: Record<string, number> = Object.fromEntries(
      item.weeklyHeatmap.map((d) => [d.day, d.quantity]),
    );

    return {
      key: item.menu,
      label: item.menu,
      values: DAYS.map((d) => byDay[d] ?? 0),
    };
  });

  const columnLabels: string[] = DAYS.map((d) => DAY_LABELS[d]);

  return { rows, columnLabels };
}
