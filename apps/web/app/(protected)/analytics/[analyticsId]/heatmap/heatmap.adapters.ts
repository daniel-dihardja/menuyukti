export type DailyHeatmapInput = {
  menu: string;
  dailyHeatmap: { hour: string; quantity: number }[];
};

export type HeatmapMatrixRow = {
  key: string;
  label: string;
  values: number[];
};

export function adaptDailyHeatmapMatrix(
  items: DailyHeatmapInput[],
  startHour = 0,
  endHour = 23,
) {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) =>
    String(startHour + i).padStart(2, "0"),
  );

  const rows: HeatmapMatrixRow[] = items.map((item) => {
    const byHour = Object.fromEntries(
      item.dailyHeatmap.map((h) => [h.hour, h.quantity]),
    );

    return {
      key: item.menu,
      label: item.menu,
      values: hours.map((h) => byHour[h] ?? 0),
    };
  });

  return {
    rows,
    columnLabels: hours.map((h) => `${h}:00`),
  };
}
