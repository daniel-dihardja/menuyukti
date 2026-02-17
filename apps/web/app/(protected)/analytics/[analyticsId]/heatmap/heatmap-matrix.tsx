"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

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

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-medium">{title}</h3>}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-[220px]">Menu</TableHead>
              {columnLabels.map((label, i) => {
                const isActive = sort?.columnIndex === i;

                return (
                  <TableHead key={label} className="p-0 text-center">
                    <button
                      onClick={() => handleSort(i)}
                      className={clsx(
                        "h-10 w-full px-2 flex items-center justify-center gap-1 hover:bg-muted transition-colors",
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
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="max-w-[220px] text-sm font-medium truncate">
                  {row.label}
                </TableCell>
                {row.values.map((value, i) => {
                  const t = getIntensity(value);
                  const bg = getColor(t);
                  const isDark = t > 0.75;

                  return (
                    <TableCell
                      key={i}
                      className="h-10 text-center text-[11px] font-medium"
                      style={{
                        backgroundColor: bg,
                        color: isDark ? "#fff" : undefined,
                      }}
                      title={`${row.label} @ ${columnLabels[i]} → ${value}`}
                    >
                      {value > 0 ? value : ""}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border rounded-md p-3 bg-muted/20 space-y-2">
        <p className="text-xs font-medium">Explainability</p>
        <p className="text-xs text-muted-foreground">
          Cell intensity reflects relative quantity for this view. Values are deterministic bucket counts
          by hour/day, not model predictions.
        </p>
        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
          <li title="Window with highest aggregated demand in the selected view.">
            Peak window: highest total quantity bucket.
          </li>
          <li title="Window with the lowest aggregated demand in the selected view.">
            Low window: lowest total quantity bucket.
          </li>
          <li title="Relative concentration of demand in one menu item compared with all visible rows.">
            Concentration risk: over-dependence on a single menu item.
          </li>
          <li title="Confidence should be downgraded when quality is warn/failed or freshness is stale.">
            Confidence is policy-aware and should follow readiness metadata.
          </li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Click a column header to sort. Click again to toggle ASC/DESC. Click a
        third time to reset.
      </p>
    </div>
  );
}
