"use client";

import { type KeyboardEvent, type ReactNode, useState } from "react";
import { TableHead } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

export type SortDirection = "asc" | "desc";

export function useSortableColumns<SortKey extends string>(
  initialSortKey: SortKey,
  initialSortDirection: SortDirection = "desc",
) {
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);

  const toggleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("desc");
  };

  return {
    sortKey,
    sortDirection,
    toggleSort,
  };
}

function sortIndicator(active: boolean, direction: SortDirection): string {
  if (!active) return "";
  return direction === "asc" ? " ▲" : " ▼";
}

type SortableTableHeadProps = {
  active: boolean;
  direction: SortDirection;
  onToggle: () => void;
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
};

export function SortableTableHead({
  active,
  direction,
  onToggle,
  children,
  align = "right",
  className,
}: SortableTableHeadProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onToggle();
  };

  return (
    <TableHead
      role="button"
      tabIndex={0}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        align === "left" && "text-left",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
      {sortIndicator(active, direction)}
    </TableHead>
  );
}
