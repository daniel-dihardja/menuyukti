"use client";

import clsx from "clsx";

/* ==================================================
 * Core types
 * ================================================== */

export type HeatmapCell = {
  key: string;
  value: number;
  label?: string;
};

export type HeatmapProps = {
  title?: string;
  cells: HeatmapCell[];
  columns: number;
  min?: number;
  max?: number;
  height?: number;
  color?: "red" | "green" | "blue";
  showLegend?: boolean;
  onCellClick?: (cell: HeatmapCell) => void;
};

/* ==================================================
 * Backend input types (your JSON shape)
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
 * Matrix-level types
 * ================================================== */

export type HeatmapMatrixRow = {
  menu: string;
  values: number[];
};

export type HeatmapMatrixProps = {
  title?: string;
  rows: HeatmapMatrixRow[];
  columnLabels: string[];
  color?: "red" | "green" | "blue";
};

/* ==================================================
 * Adapters (pure data mappers)
 * ================================================== */

export function adaptDailyHeatmap(
  data: DailyHeatmapInput,
  startHour = 0,
  endHour = 23,
): HeatmapCell[] {
  const byHour = Object.fromEntries(
    data.dailyHeatmap.map((h) => [h.hour, h.quantity]),
  );

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) =>
    String(startHour + i).padStart(2, "0"),
  );

  return hours.map((h) => ({
    key: h,
    label: `${h}:00`,
    value: byHour[h] ?? 0,
  }));
}

export function adaptWeeklyHeatmap(data: WeeklyHeatmapInput): HeatmapCell[] {
  const dayLabels: Record<string, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };

  return data.weeklyHeatmap.map((d) => ({
    key: d.day,
    label: dayLabels[d.day] ?? d.day,
    value: d.quantity,
  }));
}

/* ==================================================
 * Matrix adapters (multi-row)
 * ================================================== */

export function adaptDailyHeatmapMatrix(
  data: DailyHeatmapInput[],
  startHour = 8,
  endHour = 18,
): { rows: HeatmapMatrixRow[]; columnLabels: string[] } {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) =>
    String(startHour + i).padStart(2, "0"),
  );

  const rows = data.map((item) => {
    const byHour = Object.fromEntries(
      item.dailyHeatmap.map((h) => [h.hour, h.quantity]),
    );

    return {
      menu: item.menu,
      values: hours.map((h) => byHour[h] ?? 0),
    };
  });

  return {
    rows,
    columnLabels: hours.map((h) => `${h}:00`),
  };
}

export function adaptWeeklyHeatmapMatrix(data: WeeklyHeatmapInput[]): {
  rows: HeatmapMatrixRow[];
  columnLabels: string[];
} {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const rows = data.map((item) => {
    const byDay = Object.fromEntries(
      item.weeklyHeatmap.map((d) => [d.day, d.quantity]),
    );

    return {
      menu: item.menu,
      values: days.map((d) => byDay[d] ?? 0),
    };
  });

  return { rows, columnLabels: labels };
}

/* ==================================================
 * Matrix Heatmap Component (menus × columns)
 * ================================================== */

export function HeatmapMatrix({
  title,
  rows,
  columnLabels,
  color = "blue",
}: HeatmapMatrixProps) {
  const allValues = rows.flatMap((r) => r.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const getIntensity = (value: number) => (value - min) / range;

  const getColor = (t: number) => {
    const alpha = 0.15 + t * 0.85;
    if (color === "red") return `rgba(239, 68, 68, ${alpha})`;
    if (color === "green") return `rgba(34, 197, 94, ${alpha})`;
    return `rgba(59, 130, 246, ${alpha})`;
  };

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      )}

      <div className="overflow-auto border rounded-md">
        {/* Header */}
        <div
          className="grid bg-muted/40 border-b text-xs font-medium"
          style={{
            gridTemplateColumns: `220px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
          }}
        >
          <div className="p-2 border-r">Menu</div>
          {columnLabels.map((label) => (
            <div key={label} className="p-2 text-center border-r">
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div
            key={row.menu}
            className="grid border-b last:border-b-0"
            style={{
              gridTemplateColumns: `220px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="p-2 border-r text-sm font-medium truncate">
              {row.menu}
            </div>

            {row.values.map((value, i) => {
              const t = getIntensity(value);
              const bg = getColor(t);

              return (
                <div
                  key={i}
                  className="h-10 border-r last:border-r-0 flex items-center justify-center text-[11px] font-medium"
                  style={{ backgroundColor: bg }}
                  title={`${row.menu} @ ${columnLabels[i]} → ${value}`}
                >
                  {value > 0 ? value : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{min}</span>
        <div
          className={clsx(
            "flex-1 h-2 rounded bg-gradient-to-r",
            color === "red" && "from-red-100 via-red-400 to-red-600",
            color === "green" && "from-green-100 via-green-400 to-green-600",
            color === "blue" && "from-blue-100 via-blue-400 to-blue-600",
          )}
        />
        <span>{max}</span>
      </div>
    </div>
  );
}

/* ==================================================
 * Core Heatmap component (unchanged)
 * ================================================== */

export function Heatmap({
  title,
  cells,
  columns,
  min,
  max,
  height = 140,
  color = "blue",
  showLegend = true,
  onCellClick,
}: HeatmapProps) {
  const values = cells.map((c) => c.value);
  const computedMin = min ?? Math.min(...values);
  const computedMax = max ?? Math.max(...values);
  const range = computedMax - computedMin || 1;

  const getIntensity = (value: number) => (value - computedMin) / range;

  const getColor = (t: number) => {
    const alpha = 0.15 + t * 0.85;
    if (color === "red") return `rgba(239, 68, 68, ${alpha})`;
    if (color === "green") return `rgba(34, 197, 94, ${alpha})`;
    return `rgba(59, 130, 246, ${alpha})`;
  };

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      )}

      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          height,
        }}
      >
        {cells.map((cell) => {
          const t = getIntensity(cell.value);
          const bg = getColor(t);

          return (
            <div
              key={cell.key}
              className={clsx(
                "relative rounded-sm border border-border",
                onCellClick && "cursor-pointer hover:ring-2 hover:ring-ring",
              )}
              style={{ backgroundColor: bg }}
              title={`${cell.label ?? cell.key}: ${cell.value}`}
              onClick={() => onCellClick?.(cell)}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground/70">
                {cell.value > 0 ? cell.value : ""}
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{computedMin}</span>
          <div
            className={clsx(
              "flex-1 h-2 rounded bg-gradient-to-r",
              color === "red" && "from-red-100 via-red-400 to-red-600",
              color === "green" && "from-green-100 via-green-400 to-green-600",
              color === "blue" && "from-blue-100 via-blue-400 to-blue-600",
            )}
          />
          <span>{computedMax}</span>
        </div>
      )}
    </div>
  );
}
