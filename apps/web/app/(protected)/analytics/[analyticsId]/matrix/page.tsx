export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { Button } from "@workspace/ui/components/button";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import { formatCurrencyWithCode, getCurrencyLocale } from "@/lib/currency";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";

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
  const tSales = await getTranslations("analytics.sales");
  const tMatrix = await getTranslations("analytics.matrix");

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

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;
  const matrix = analytics.matrixJson as MatrixJson | null;
  const currencyCode = analytics.branch?.currencyCode ?? "IDR";

  if (!matrix) {
    return (
      <AnalyticsPageShell
        title={tMatrix("reportTitle")}
        breadcrumbs={[
          { label: tSales("title"), href: routes.analytics.sales },
          { label: analyticsName },
          { label: tMatrix("breadcrumb") },
        ]}
      >
        <section className="border rounded-md p-6 space-y-3">
          <PageHeading
            title={tMatrix("heading")}
            description={tMatrix("empty.description")}
          />
          <Button asChild>
            <Link href={routes.analytics.cogs(analyticsId)}>
              {tMatrix("empty.cta")}
            </Link>
          </Button>
        </section>
      </AnalyticsPageShell>
    );
  }

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
    formatCurrencyWithCode(value, currencyCode, locale);

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

  const categoryOrder = [
    "star",
    "plow_horse",
    "puzzle",
    "low_end",
  ] as const;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <AnalyticsPageShell
      title={tMatrix("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tMatrix("breadcrumb") },
      ]}
    >
      <PageHeading
        title={tMatrix("heading")}
        description={tMatrix("description")}
      />

          {/* ---------------------------------------------
           * KPI OVERVIEW
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{tMatrix("overview.title")}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Period */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">{tMatrix("overview.period.title")}</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.period.start")}</span>{" "}
                    <span className="font-medium">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.period.end")}</span>{" "}
                    <span className="font-medium">{endDate}</span>
                  </div>
                </div>
              </div>

              {/* Orders & Items */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">{tMatrix("overview.ordersAndItems.title")}</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.ordersAndItems.orders")}</span>{" "}
                    <span className="font-medium">
                      {analytics.totalOrders?.toLocaleString(locale) ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.ordersAndItems.itemsSold")}</span>{" "}
                    <span className="font-medium">
                      {analytics.totalItemsSold?.toLocaleString(locale) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Averages */}
              <div className="border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border">
                <p className="text-sm text-muted-foreground">{tMatrix("overview.averages.title")}</p>
                <div className="text-sm">
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.averages.avgRevenue")}</span>{" "}
                    <span className="font-medium">
                      {analytics.avgOrderRevenue
                        ? fmtCurrency(Number(analytics.avgOrderRevenue))
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{tMatrix("overview.averages.avgItems")}</span>{" "}
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
              {tMatrix("distribution.title")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryOrder.map((key) => {
                const label = tMatrix(`categories.${key}`);
                const item = byCategory(key);
                const share = item ? Math.max(item.percentage * 100, 0) : 0;

                return (
                  <div key={key} className="border p-4 shadow-sm bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{label}</p>
                    </div>

                    <div className="text-sm">
                      <div>
                        <span className="text-muted-foreground">{tMatrix("distribution.items")}</span>{" "}
                        <span className="font-medium">
                          {item?.count ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tMatrix("distribution.share")}</span>{" "}
                        <span className="font-medium">
                          {item
                            ? `${share.toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{tMatrix("distribution.margin")}</span>{" "}
                        <span className="font-medium">
                          {item
                            ? `${(
                                item.margin_contribution_percentage * 100
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden bg-muted/60">
                      <div
                        className="h-full bg-foreground/30"
                        style={{ width: `${Math.min(share, 100)}%` }}
                      />
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
            <h2 className="text-xl font-semibold">{tMatrix("analysis.title")}</h2>

            {categoryOrder.map((key) => (
              <MatrixCategoryTable
                key={key}
                title={tMatrix(`categories.${key}`)}
                items={itemsByCategory[key]}
                locale={locale}
                currency={currencyCode}
              />
            ))}
          </section>
    </AnalyticsPageShell>
  );
}
