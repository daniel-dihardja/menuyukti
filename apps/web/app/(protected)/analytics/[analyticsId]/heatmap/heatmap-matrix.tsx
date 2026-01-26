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
  color = "blue",
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
        return { columnIndex, direction: "desc" }; // default first click: DESC
      }

      if (prev.direction === "desc") {
        return { columnIndex, direction: "asc" };
      }

      return null; // third click resets sorting
    });
  };

  /* ---------------------------------------------
   * Color scaling (based on visible rows only)
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

  /* ---------------------------------------------
   * UI
   * --------------------------------------------- */
  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-medium">{title}</h3>}

      <div className="overflow-auto border rounded-md">
        {/* Header row */}
        <div
          className="grid bg-muted/40 border-b text-xs font-medium"
          style={{
            gridTemplateColumns: `220px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
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
                  "p-2 border-r flex items-center justify-center gap-1 hover:bg-muted transition-colors",
                  isActive && "bg-muted",
                )}
                title="Click to sort"
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
              gridTemplateColumns: `220px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
            }}
          >
            {/* Menu name */}
            <div className="p-2 border-r text-sm font-medium truncate">
              {row.label}
            </div>

            {/* Heat cells */}
            {row.values.map((value, i) => {
              const t = getIntensity(value);
              const bg = getColor(t);

              return (
                <div
                  key={i}
                  className="relative border-r last:border-r-0 h-10 flex items-center justify-center text-[11px] font-medium"
                  style={{ backgroundColor: bg }}
                  title={`${row.label} @ ${columnLabels[i]} → ${value}`}
                >
                  {value > 0 ? value : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sort hint */}
      <p className="text-xs text-muted-foreground">
        Click a column header to sort. Click again to toggle ASC/DESC. Click a
        third time to reset.
      </p>
    </div>
  );
}
