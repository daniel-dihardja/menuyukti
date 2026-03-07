"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { formatCurrencyWithCode } from "@/lib/currency";
import {
  useSortableColumns,
  SortableTableHead,
} from "@/components/sortable-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { MatrixCategory, MatrixDisplayRow } from "@/lib/analytics/matrix-page-adapter";

type SortKey = "menuItem" | "unitsSold" | "revenue" | "marginPct";

type ActionType = "keep" | "promote" | "reprice" | "remove";

const CATEGORY_BADGE_CLASS: Record<MatrixCategory, string> = {
  star: "bg-emerald-600 text-white border-transparent",
  plow_horse: "bg-amber-500 text-black border-transparent",
  puzzle: "bg-sky-100 text-sky-800 border-sky-300",
  low_end: "bg-rose-100 text-rose-700 border-rose-300",
};

function actionVariant(
  action: ActionType,
): "default" | "secondary" | "destructive" | "outline" {
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

type Props = {
  category: MatrixCategory;
  items: MatrixDisplayRow[];
  locale: string;
  currency: string;
};

export function MatrixCategoryTable({ category, items, locale, currency }: Props) {
  const tTable = useTranslations("analytics.matrix.table");
  const tCategories = useTranslations("analytics.matrix.categories");
  const { sortKey, sortDirection, toggleSort } =
    useSortableColumns<SortKey>("unitsSold", "desc");

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal, locale);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDirection === "asc" ? diff : -diff;
    });
  }, [items, sortKey, sortDirection, locale]);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {tCategories(category)}
        </h3>
        <Badge
          variant="outline"
          className={CATEGORY_BADGE_CLASS[category]}
        >
          {tCategories(category)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          ({items.length} {items.length === 1 ? "item" : "items"})
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <caption className="sr-only">
            {tCategories(category)} menu items: Menu, Units sold, Revenue, Margin %, Action.
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <SortableTableHead
                align="left"
                active={sortKey === "menuItem"}
                direction={sortDirection}
                onToggle={() => toggleSort("menuItem")}
              >
                {tTable("menu")}
              </SortableTableHead>
              <SortableTableHead
                active={sortKey === "unitsSold"}
                direction={sortDirection}
                onToggle={() => toggleSort("unitsSold")}
              >
                {tTable("qty")}
              </SortableTableHead>
              <SortableTableHead
                active={sortKey === "revenue"}
                direction={sortDirection}
                onToggle={() => toggleSort("revenue")}
              >
                {tTable("revenue")}
              </SortableTableHead>
              <SortableTableHead
                active={sortKey === "marginPct"}
                direction={sortDirection}
                onToggle={() => toggleSort("marginPct")}
              >
                {tTable("percentage")}
              </SortableTableHead>
              <TableHead className="text-center">{tTable("action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No items in this category.
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((item) => (
                <TableRow
                  key={`${category}-${item.menuItem}`}
                  className="hover:bg-muted/20 odd:bg-background even:bg-muted/10"
                >
                  <TableCell className="px-3 py-2 font-medium">
                    {item.menuItem}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {item.unitsSold.toLocaleString(locale)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {formatCurrencyWithCode(item.revenue, currency, locale)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {(item.marginPct * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center">
                    {item.action ? (
                      item.actionReason ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={actionVariant(item.action)}
                              className="cursor-help tracking-wide"
                              aria-label={`${tTable(`actions.${item.action}`)}. ${item.actionReason}`}
                            >
                              {tTable(`actions.${item.action}`)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-xs leading-relaxed"
                          >
                            <p className="font-semibold">
                              {tTable("actionReasonLabel")}
                            </p>
                            <p>{item.actionReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge
                          variant={actionVariant(item.action)}
                          className="tracking-wide"
                        >
                          {tTable(`actions.${item.action}`)}
                        </Badge>
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
