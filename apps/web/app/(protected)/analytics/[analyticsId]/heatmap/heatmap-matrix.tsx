"use client";

import clsx from "clsx";

export type HeatmapMatrixRow = {
  key: string;
  label: string;
  values: number[];
};

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
    <div className="space-y-2">
      {title && <h3 className="text-sm font-medium">{title}</h3>}

      <div className="overflow-auto border rounded-md">
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

        {rows.map((row) => (
          <div
            key={row.key}
            className="grid border-b last:border-b-0"
            style={{
              gridTemplateColumns: `220px repeat(${columnLabels.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="p-2 border-r text-sm font-medium truncate">
              {row.label}
            </div>

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
    </div>
  );
}
