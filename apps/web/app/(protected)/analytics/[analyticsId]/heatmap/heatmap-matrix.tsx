"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type HeatmapMatrixRow = {
  key: string;
  label: string;
  values: number[];
};

type SortState = {
  columnIndex: number;
  direction: "asc" | "desc";
} | null;

type Props = {
  title?: string;
  rows: HeatmapMatrixRow[];
  columnLabels: string[];
  color?: "red" | "green" | "blue";
};

export function HeatmapMatrix({
  title,
  rows,
  columnLabels,
  color = "green",
}: Props) {
  const [sort, setSort] = useState<SortState>(null);

  /* ---------------------------------------------
   * Sorting logic
   * --------------------------------------------- */
  const sortedRows = useMemo(() => {
    if (!sort) return rows;

    const { columnIndex, direction } = sort;

    return [...rows].sort((a, b) => {
      const aVal = a.values[columnIndex] ?? 0;
      const bVal = b.values[columnIndex] ?? 0;
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [rows, sort]);

  const handleSort = (columnIndex: number) => {
    setSort((prev) => {
      if (!prev || prev.columnIndex !== columnIndex) {
        return { columnIndex, direction: "desc" };
      }
      if (prev.direction === "desc") return { columnIndex, direction: "asc" };
      return null;
    });
  };

  /* ---------------------------------------------
   * Color scaling
   * --------------------------------------------- */
  const allValues = sortedRows.flatMap((r) => r.values);
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

  const MENU_COL_WIDTH = 220;

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium">{title}</h3>}

      <div className="overflow-auto border rounded-md">
        {/* ==================================================
            DESKTOP TABLE (md+)
           ================================================== */}
        <div className="hidden md:block">
          {/* Header row */}
          <div
            className="grid bg-muted/40 border-b text-xs font-medium"
            style={{
              gridTemplateColumns: `${MENU_COL_WIDTH}px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="p-2 border-r">Menu</div>

            {columnLabels.map((label, i) => {
              const isActive = sort?.columnIndex === i;

              return (
                <button
                  key={label}
                  onClick={() => handleSort(i)}
                  className={clsx(
                    "p-2 border-r last:border-r-0 flex items-center justify-center gap-1 hover:bg-muted transition-colors",
                    isActive && "bg-muted",
                  )}
                  title="Click to sort"
                  type="button"
                >
                  <span>{label}</span>
                  {isActive && sort?.direction === "desc" && (
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  )}
                  {isActive && sort?.direction === "asc" && (
                    <ChevronUp className="w-3 h-3 opacity-70" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Data rows */}
          {sortedRows.map((row) => (
            <div
              key={row.key}
              className="grid border-b last:border-b-0"
              style={{
                gridTemplateColumns: `${MENU_COL_WIDTH}px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
              }}
            >
              <div className="p-2 border-r text-sm font-medium truncate">
                {row.label}
              </div>

              {row.values.map((value, i) => {
                const t = getIntensity(value);
                const bg = getColor(t);
                const isDark = t > 0.75;

                return (
                  <div
                    key={i}
                    className="relative border-r last:border-r-0 h-10 flex items-center justify-center text-[11px] font-medium"
                    style={{
                      backgroundColor: bg,
                      color: isDark ? "#fff" : undefined,
                    }}
                    title={`${row.label} @ ${columnLabels[i]} → ${value}`}
                  >
                    {value > 0 ? value : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ==================================================
            MOBILE STACKED (< md)
           ================================================== */}
        <div className="md:hidden space-y-4">
          {/* Column labels */}
          <div
            className="grid bg-muted/40 border-b text-xs font-medium"
            style={{
              gridTemplateColumns: `repeat(${columnLabels.length}, minmax(28px, 1fr))`,
            }}
          >
            {columnLabels.map((label) => (
              <div
                key={label}
                className="p-2 text-center border-r last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          {sortedRows.map((row) => (
            <div key={row.key} className="overflow-hidden">
              {/* Menu label ABOVE heatmap */}
              <div className="px-2 mt-2 text-sm font-semibold bg-muted/20">
                {row.label}
              </div>

              {/* Padding between label & heatmap */}
              <div className="h-2 bg-background" />

              {/* Heat cells */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columnLabels.length}, minmax(28px, 1fr))`,
                }}
              >
                {row.values.map((value, i) => {
                  const t = getIntensity(value);
                  const bg = getColor(t);
                  const isDark = t > 0.75;

                  return (
                    <div
                      key={i}
                      className="relative border-r last:border-r-0 h-10 flex items-center justify-center text-[11px] font-medium"
                      style={{
                        backgroundColor: bg,
                        color: isDark ? "#fff" : undefined,
                      }}
                      title={`${row.label} @ ${columnLabels[i]} → ${value}`}
                    >
                      {value > 0 ? value : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sort hint */}
      <p className="hidden md:block text-xs text-muted-foreground">
        Click a column header to sort. Click again to toggle ASC/DESC. Click a
        third time to reset.
      </p>
    </div>
  );
}
