"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { formatCurrencyWithCode } from "@/lib/currency";
import {
  SortableTableHead,
  useSortableColumns,
} from "@/components/sortable-table";
import {
  type DecisionGradeMatrixRow,
  type MatrixAction,
  type MatrixCategory,
} from "@/lib/analytics/matrix-row-contract";
import { emitMatrixTelemetryEvent } from "@/lib/analytics/matrix-telemetry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type SortKey = keyof Pick<
  DecisionGradeMatrixRow,
  | "menuItem"
  | "category"
  | "unitsSold"
  | "revenue"
  | "cogs"
  | "contributionMargin"
  | "marginPct"
  | "action"
>;

type Props = {
  items: DecisionGradeMatrixRow[];
  locale: string;
  currency: string;
  analyticsId: number;
};

const CATEGORY_BADGE_VARIANT: Record<MatrixCategory, "default" | "secondary" | "outline"> = {
  star: "default",
  plow_horse: "secondary",
  puzzle: "outline",
  low_end: "outline",
};

const CATEGORY_BADGE_CLASS: Record<MatrixCategory, string> = {
  star: "bg-emerald-600 text-white border-transparent",
  plow_horse: "bg-amber-500 text-black border-transparent",
  puzzle: "bg-sky-100 text-sky-800 border-sky-300",
  low_end: "bg-rose-100 text-rose-700 border-rose-300",
};

function actionVariant(action: MatrixAction): "default" | "secondary" | "destructive" | "outline" {
  switch (action) {
    case "remove":
      return "destructive";
    case "reprice":
      return "secondary";
    case "promote":
      return "default";
    case "keep":
      return "outline";
    default:
      return "outline";
  }
}

export function MatrixInsightTable({ items, locale, currency, analyticsId }: Props) {
  const tMatrix = useTranslations("analytics.matrix");
  const tTable = useTranslations("analytics.matrix.table");
  const tCategories = useTranslations("analytics.matrix.categories");
  const { sortKey, sortDirection: sortDir, toggleSort } =
    useSortableColumns<SortKey>("unitsSold");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return -1;
      if (bVal == null) return 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal, locale);
      }

      return Number(aVal) - Number(bVal);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [items, sortKey, sortDir, locale]);

  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedItems = sortedItems.slice(pageStart, pageStart + pageSize);
  const fromIndex = totalItems === 0 ? 0 : pageStart + 1;
  const toIndex = Math.min(totalItems, pageStart + pageSize);

  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {tMatrix("emptyFiltered")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          Showing {fromIndex}-{toIndex} of {totalItems} items
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="matrix-page-size" className="text-muted-foreground">
            Rows
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const next = Number(value);
              setPageSize(next);
              setPage(1);
            }}
          >
            <SelectTrigger
              id="matrix-page-size"
              className="w-20 rounded-none"
              aria-label="Rows per page"
            >
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
        <caption className="sr-only">
          Menu engineering matrix table with category and recommendation actions.
        </caption>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <SortableTableHead
              align="left"
              active={sortKey === "menuItem"}
              direction={sortDir}
              onToggle={() => toggleSort("menuItem")}
            >
              {tTable("menu")}
            </SortableTableHead>
            <SortableTableHead
              align="left"
              active={sortKey === "category"}
              direction={sortDir}
              onToggle={() => toggleSort("category")}
            >
              {tTable("category")}
            </SortableTableHead>
            <SortableTableHead
              active={sortKey === "unitsSold"}
              direction={sortDir}
              onToggle={() => toggleSort("unitsSold")}
            >
              {tTable("qty")}
            </SortableTableHead>
            <SortableTableHead
              active={sortKey === "revenue"}
              direction={sortDir}
              onToggle={() => toggleSort("revenue")}
            >
              {tTable("revenue")}
            </SortableTableHead>
            <SortableTableHead
              active={sortKey === "cogs"}
              direction={sortDir}
              onToggle={() => toggleSort("cogs")}
            >
              {tTable("cogs")}
            </SortableTableHead>
            <SortableTableHead
              active={sortKey === "contributionMargin"}
              direction={sortDir}
              onToggle={() => toggleSort("contributionMargin")}
            >
              {tTable("margin")}
            </SortableTableHead>
            <SortableTableHead
              active={sortKey === "marginPct"}
              direction={sortDir}
              onToggle={() => toggleSort("marginPct")}
            >
              {tTable("percentage")}
            </SortableTableHead>
            <SortableTableHead
              align="center"
              active={sortKey === "action"}
              direction={sortDir}
              onToggle={() => toggleSort("action")}
            >
              {tTable("action")}
            </SortableTableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pagedItems.map((item) => (
            <TableRow
              key={`${item.category}-${item.menuItem}`}
              className="hover:bg-muted/20 odd:bg-background even:bg-muted/10"
            >
              <TableCell className="px-3 py-2 font-medium">{item.menuItem}</TableCell>
              <TableCell className="px-3 py-2">
                <Badge
                  variant={CATEGORY_BADGE_VARIANT[item.category]}
                  className={CATEGORY_BADGE_CLASS[item.category]}
                >
                  {tCategories(item.category)}
                </Badge>
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                {item.unitsSold.toLocaleString(locale)}
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                {formatCurrencyWithCode(item.revenue, currency, locale)}
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                {item.cogs === null ? "—" : formatCurrencyWithCode(item.cogs, currency, locale)}
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                {formatCurrencyWithCode(item.contributionMargin, currency, locale)}
              </TableCell>
              <TableCell className="px-3 py-2 text-right">
                {(item.marginPct * 100).toFixed(1)}%
              </TableCell>
              <TableCell className="px-3 py-2 text-center">
                {item.action ? (
                  <Tooltip
                    onOpenChange={(open) => {
                      if (!open) return;
                      emitMatrixTelemetryEvent({
                        eventName: "matrix_action_reason_opened",
                        analyticsId,
                        properties: {
                          category: item.category,
                          action: item.action,
                          reason_code: item.reasonCode ?? "unknown",
                        },
                      });
                    }}
                  >
                    <TooltipTrigger asChild>
                      <Badge
                        variant={actionVariant(item.action)}
                        className="cursor-help tracking-wide"
                        aria-label={`${tTable(`actions.${item.action}`)}. ${item.actionReason}`}
                      >
                        {tTable(`actions.${item.action}`)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                      <p className="font-semibold">{tTable("actionReasonLabel")}</p>
                      <p>{item.actionReason}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={safePage <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={safePage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
