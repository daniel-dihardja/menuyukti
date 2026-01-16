"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";

type Action = "remove" | "reprice" | "promote" | "keep";

type MatrixItem = {
  menu: string;
  category: "star" | "plow_horse" | "puzzle" | "low_end";
  quantity: number;
  total_revenue: number;
  cogs: number;
  contribution_margin: number;
  contribution_margin_percentage: number;
  action?: Action;
};

type SortKey = keyof Pick<
  MatrixItem,
  | "menu"
  | "quantity"
  | "total_revenue"
  | "cogs"
  | "contribution_margin"
  | "contribution_margin_percentage"
  | "action"
>;

type Props = {
  title: string;
  items: MatrixItem[];
  locale: string;
  currency: string;
};

export function MatrixCategoryTable({ title, items, locale, currency }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("quantity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }),
    [locale, currency]
  );

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
    "px-3 py-2 cursor-pointer select-none whitespace-nowrap text-right";
  const thLeft = `${th} text-left`;

  const actionVariant = (action: Action) => {
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

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className={thLeft} onClick={() => toggleSort("menu")}>
                Menu <SortIndicator col="menu" />
              </th>

              <th className={th} onClick={() => toggleSort("quantity")}>
                Qty <SortIndicator col="quantity" />
              </th>

              <th className={th} onClick={() => toggleSort("total_revenue")}>
                Revenue <SortIndicator col="total_revenue" />
              </th>

              <th className={th} onClick={() => toggleSort("cogs")}>
                COGS <SortIndicator col="cogs" />
              </th>

              <th
                className={th}
                onClick={() => toggleSort("contribution_margin")}
              >
                Margin <SortIndicator col="contribution_margin" />
              </th>

              <th
                className={th}
                onClick={() => toggleSort("contribution_margin_percentage")}
              >
                % <SortIndicator col="contribution_margin_percentage" />
              </th>

              {hasActions && (
                <th
                  className={`${th} text-center`}
                  onClick={() => toggleSort("action")}
                >
                  Action <SortIndicator col="action" />
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.menu} className="border-t hover:bg-muted/50">
                <td className="px-3 py-2">{item.menu}</td>

                <td className="px-3 py-2 text-right">
                  {item.quantity.toLocaleString(locale)}
                </td>

                <td className="px-3 py-2 text-right">
                  {currencyFormatter.format(item.total_revenue)}
                </td>

                <td className="px-3 py-2 text-right">
                  {currencyFormatter.format(item.cogs)}
                </td>

                <td className="px-3 py-2 text-right">
                  {currencyFormatter.format(item.contribution_margin)}
                </td>

                <td className="px-3 py-2 text-right">
                  {(item.contribution_margin_percentage * 100).toFixed(1)}%
                </td>

                {hasActions && (
                  <td className="px-3 py-2 text-center">
                    {item.action ? (
                      <Badge variant={actionVariant(item.action)}>
                        {item.action.toUpperCase()}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
