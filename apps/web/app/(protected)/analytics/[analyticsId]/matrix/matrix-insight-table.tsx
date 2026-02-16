"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { formatCurrencyWithCode } from "@/lib/currency";
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
  const [sortKey, setSortKey] = useState<SortKey>("unitsSold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
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

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  };

  const SortIndicator = ({ col }: { col: SortKey }) =>
    col === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : null;

  const thClassName =
    "cursor-pointer select-none whitespace-nowrap text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const thLeftClassName = `${thClassName} text-left`;

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
          <label htmlFor="matrix-page-size" className="text-muted-foreground">
            Rows
          </label>
          <select
            id="matrix-page-size"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={pageSize}
            onChange={(event) => {
              const next = Number(event.target.value);
              setPageSize(next);
              setPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
        <caption className="sr-only">
          Menu engineering matrix table with category and recommendation actions.
        </caption>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className={thLeftClassName} onClick={() => toggleSort("menuItem")}>
              {tTable("menu")} <SortIndicator col="menuItem" />
            </TableHead>
            <TableHead className={thLeftClassName} onClick={() => toggleSort("category")}>
              {tTable("category")} <SortIndicator col="category" />
            </TableHead>
            <TableHead className={thClassName} onClick={() => toggleSort("unitsSold")}>
              {tTable("qty")} <SortIndicator col="unitsSold" />
            </TableHead>
            <TableHead className={thClassName} onClick={() => toggleSort("revenue")}>
              {tTable("revenue")} <SortIndicator col="revenue" />
            </TableHead>
            <TableHead className={thClassName} onClick={() => toggleSort("cogs")}>
              {tTable("cogs")} <SortIndicator col="cogs" />
            </TableHead>
            <TableHead className={thClassName} onClick={() => toggleSort("contributionMargin")}>
              {tTable("margin")} <SortIndicator col="contributionMargin" />
            </TableHead>
            <TableHead className={thClassName} onClick={() => toggleSort("marginPct")}>
              {tTable("percentage")} <SortIndicator col="marginPct" />
            </TableHead>
            <TableHead className="cursor-pointer text-center" onClick={() => toggleSort("action")}>
              {tTable("action")} <SortIndicator col="action" />
            </TableHead>
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
