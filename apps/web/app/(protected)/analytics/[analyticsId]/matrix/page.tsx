export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import { formatCurrency, getCurrencyLocale } from "@/lib/currency";

import { MatrixCategoryTable } from "./matrix-category-table";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
};

type MatrixDistributionItem = {
  category: "star" | "plow_horse" | "puzzle" | "low_end";
  count: number;
  percentage: number;
  margin_contribution_percentage: number;
};

type MatrixItem = {
  menu: string;
  category: "star" | "plow_horse" | "puzzle" | "low_end";
  quantity: number;
  total_revenue: number;
  cogs: number;
  contribution_margin: number;
  contribution_margin_percentage: number;
};

type MatrixJson = {
  items: MatrixItem[];
  distribution: MatrixDistributionItem[];
};

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("analytics.sales");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  // --------------------------------------------------
  // Fetch analytics snapshot
  // --------------------------------------------------
  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      sourceFile: true,
      branch: {
        select: {
          currencyCode: true,
        },
      },
      periodStart: true,
      periodEnd: true,
      totalOrders: true,
      totalItemsSold: true,
      avgOrderRevenue: true,
      avgOrderItems: true,
      matrixJson: true,
      matrixDistributionJson: true,
    },
  });

  if (!analytics?.matrixJson) notFound();

  const matrix = analytics.matrixJson as MatrixJson;
  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;
  const currencyCode = analytics.branch?.currencyCode ?? "IDR";

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------
  const locale = getCurrencyLocale(currencyCode);

  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const startDate = analytics.periodStart
    ? dateFormatter.format(analytics.periodStart)
    : "—";

  const endDate = analytics.periodEnd
    ? dateFormatter.format(analytics.periodEnd)
    : "—";

  const fmtCurrency = (value: number) =>
    formatCurrency(value, currencyCode, locale);

  // --------------------------------------------------
  // Matrix helpers
  // --------------------------------------------------
  const itemsByCategory = {
    star: matrix.items.filter((i) => i.category === "star"),
    plow_horse: matrix.items.filter((i) => i.category === "plow_horse"),
    puzzle: matrix.items.filter((i) => i.category === "puzzle"),
    low_end: matrix.items.filter((i) => i.category === "low_end"),
  };

  Object.values(itemsByCategory).forEach((items) =>
    items.sort((a, b) => b.quantity - a.quantity),
  );

  const distribution =
    (analytics.matrixDistributionJson as MatrixDistributionItem[]) ??
    matrix.distribution ??
    [];

  const byCategory = (cat: MatrixDistributionItem["category"]) =>
    distribution.find((d) => d.category === cat);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title="Menu Engineering Report"
          breadcrumbs={[
            { label: t("title"), href: routes.analytics.sales },
            { label: analyticsName },
            { label: "Matrix" },
          ]}
        />

        <main className="p-4 space-y-12 max-w-6xl mx-auto">

          {/* Page headline */}
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">Menu Engineering Matrix</h1>
            <p className="text-sm text-muted-foreground">
              Performance overview and optimization insights per menu item
            </p>
          </header>

          {/* ---------------------------------------------
           * KPI OVERVIEW
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Sales Overview</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Period */}
              <div className="border rounded-md p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Period</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span>{" "}
                    <span className="font-medium">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>{" "}
                    <span className="font-medium">{endDate}</span>
                  </div>
                </div>
              </div>

              {/* Orders & Items */}
              <div className="border rounded-md p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Orders & Items</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">Orders:</span>{" "}
                    <span className="font-medium">
                      {analytics.totalOrders?.toLocaleString(locale) ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items Sold:</span>{" "}
                    <span className="font-medium">
                      {analytics.totalItemsSold?.toLocaleString(locale) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Averages */}
              <div className="border rounded-md p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Averages</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">Avg Revenue:</span>{" "}
                    <span className="font-medium">
                      {analytics.avgOrderRevenue
                        ? fmtCurrency(Number(analytics.avgOrderRevenue))
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Items:</span>{" "}
                    <span className="font-medium">
                      {analytics.avgOrderItems?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------
           * MATRIX DISTRIBUTION
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              Menu Performance Distribution
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: "star", label: "Stars" },
                { key: "plow_horse", label: "Plow Horses" },
                { key: "puzzle", label: "Puzzles" },
                { key: "low_end", label: "Low End" },
              ].map(({ key, label }) => {
                const item = byCategory(key as any);
                return (
                  <div key={key} className="border rounded-md p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <div className="text-sm">
                      <div>
                        <span className="text-muted-foreground">Items:</span>{" "}
                        <span className="font-medium">
                          {item?.count ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Share:</span>{" "}
                        <span className="font-medium">
                          {item
                            ? `${(item.percentage * 100).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin:</span>{" "}
                        <span className="font-medium">
                          {item
                            ? `${(
                                item.margin_contribution_percentage * 100
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------------------------------------------
           * MATRIX DETAILS
           * --------------------------------------------- */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Menu Item Analysis</h2>

            {(
              [
                ["star", "Stars"],
                ["plow_horse", "Plow Horses"],
                ["puzzle", "Puzzles"],
                ["low_end", "Low End"],
              ] as const
            ).map(([key, label]) => (
              <MatrixCategoryTable
                key={key}
                title={label}
                items={itemsByCategory[key]}
                locale={locale}
                currency={currencyCode}
              />
            ))}
          </section>
        </main>
      </div>
    </SidebarInset>
  );
}
