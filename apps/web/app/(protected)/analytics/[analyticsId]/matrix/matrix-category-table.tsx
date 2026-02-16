"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/badge";
import { formatCurrencyWithCode } from "@/lib/currency";
import {
  type DecisionGradeMatrixRow,
  type MatrixAction,
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
  | "unitsSold"
  | "revenue"
  | "cogs"
  | "contributionMargin"
  | "marginPct"
  | "action"
>;

type Props = {
  title: string;
  items: DecisionGradeMatrixRow[];
  locale: string;
  currency: string;
};

export function MatrixCategoryTable({
  title,
  items,
  locale,
  currency,
}: Props) {
  const t = useTranslations("analytics.matrix.table");
  const [sortKey, setSortKey] = useState<SortKey>("unitsSold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!items.length) return null;

  const hasActions = items.some((i) => i.action);

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
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIndicator = ({ col }: { col: SortKey }) =>
    col === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : null;

  const th =
    "cursor-pointer select-none whitespace-nowrap text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const thLeft = `${th} text-left`;

  const actionVariant = (action: MatrixAction) => {
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
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="overflow-hidden border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={thLeft} onClick={() => toggleSort("menuItem")}>
                {t("menu")} <SortIndicator col="menuItem" />
              </TableHead>

              <TableHead className={th} onClick={() => toggleSort("unitsSold")}>
                {t("qty")} <SortIndicator col="unitsSold" />
              </TableHead>

              <TableHead
                className={th}
                onClick={() => toggleSort("revenue")}
              >
                {t("revenue")} <SortIndicator col="revenue" />
              </TableHead>

              <TableHead className={th} onClick={() => toggleSort("cogs")}>
                {t("cogs")} <SortIndicator col="cogs" />
              </TableHead>

              <TableHead
                className={th}
                onClick={() => toggleSort("contributionMargin")}
              >
                {t("margin")} <SortIndicator col="contributionMargin" />
              </TableHead>

              <TableHead
                className={th}
                onClick={() => toggleSort("marginPct")}
              >
                {t("percentage")} <SortIndicator col="marginPct" />
              </TableHead>

              {hasActions && (
                <TableHead
                  className="cursor-pointer text-center"
                  onClick={() => toggleSort("action")}
                >
                  {t("action")} <SortIndicator col="action" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.menuItem} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2 font-medium">{item.menuItem}</TableCell>

                <TableCell className="px-3 py-2 text-right">
                  {item.unitsSold.toLocaleString(locale)}
                </TableCell>

                <TableCell className="px-3 py-2 text-right">
                  {formatCurrencyWithCode(item.revenue, currency, locale)}
                </TableCell>

                <TableCell className="px-3 py-2 text-right">
                  {item.cogs === null
                    ? "—"
                    : formatCurrencyWithCode(item.cogs, currency, locale)}
                </TableCell>

                <TableCell className="px-3 py-2 text-right">
                  {formatCurrencyWithCode(item.contributionMargin, currency, locale)}
                </TableCell>

                <TableCell className="px-3 py-2 text-right">
                  {(item.marginPct * 100).toFixed(1)}%
                </TableCell>

                {hasActions && (
                  <TableCell className="px-3 py-2 text-center">
                    {item.action ? (
                      <Badge variant={actionVariant(item.action)}>
                        {t(`actions.${item.action}`)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
