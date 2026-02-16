"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/badge";
import { formatCurrencyWithCode } from "@/lib/currency";
import {
  type DecisionGradeMatrixRow,
  type MatrixAction,
  type MatrixCategory,
} from "@/lib/analytics/matrix-row-contract";
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
};

const CATEGORY_BADGE_VARIANT: Record<MatrixCategory, "default" | "secondary" | "outline"> = {
  star: "default",
  plow_horse: "secondary",
  puzzle: "outline",
  low_end: "outline",
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

export function MatrixInsightTable({ items, locale, currency }: Props) {
  const tMatrix = useTranslations("analytics.matrix");
  const tTable = useTranslations("analytics.matrix.table");
  const tCategories = useTranslations("analytics.matrix.categories");
  const [sortKey, setSortKey] = useState<SortKey>("unitsSold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {tMatrix("emptyFiltered")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-sm">
      <Table>
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
          {sortedItems.map((item) => (
            <TableRow key={`${item.category}-${item.menuItem}`} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2 font-medium">{item.menuItem}</TableCell>
              <TableCell className="px-3 py-2">
                <Badge variant={CATEGORY_BADGE_VARIANT[item.category]}>
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
                  <Badge variant={actionVariant(item.action)}>
                    {tTable(`actions.${item.action}`)}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
