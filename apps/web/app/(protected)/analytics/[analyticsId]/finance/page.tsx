export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { notFound } from "next/navigation";
import { getAppCurrencyCode, getAppCurrencyLocale } from "@/lib/app-currency";
import { formatCurrencyWithCode } from "@/lib/currency";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type PageProps = {
  params: Promise<{ analyticsId?: string }>;
};

export default async function Page({ params }: PageProps) {
  const tSales = await getTranslations("analytics.sales");
  const tFinance = await getTranslations("analytics.finance");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  // --------------------------------------------------
  // Fetch analytics run from GraphQL
  // --------------------------------------------------
  const data = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, {
    id: String(analyticsId),
  });
  const run = data.analytics_run;
  if (!run) notFound();

  const analyticsName = run.name ?? run.filename ?? `Analytics #${analyticsId}`;
  const currencyCode = getAppCurrencyCode();
  const locale = getAppCurrencyLocale();

  // Derive finance KPIs from menu engineering matrix (GraphQL has no totalRevenue/totalCogs/totalProfit)
  const eng = run.menuEngineeringMatrix;
  const totalRevenue = eng
    ? eng.items.reduce((s, i) => s + i.totalRevenue, 0)
    : 0;
  const totalCogs = eng ? eng.items.reduce((s, i) => s + i.totalCogs, 0) : 0;
  const totalProfit = eng ? eng.thresholds.totalProfit : 0;
  // Fixed costs not exposed by GraphQL; use 0
  const totalFixedCosts = 0;
  const netProfit = totalProfit - totalFixedCosts;

  const totalItemsSold = eng ? eng.items.reduce((s, i) => s + i.quantity, 0) : null;
  const analytics = {
    periodStart: run.periodStart ? new Date(run.periodStart) : null,
    periodEnd: run.periodEnd ? new Date(run.periodEnd) : null,
    totalOrders: null as number | null,
    totalItemsSold,
    avgOrderRevenue: run.orderMetrics.avgOrderRevenue,
    avgOrderItems: run.orderMetrics.avgOrderSize,
  };
  const fixedCosts: Array<{ id: number; name: string; amount: number }> = [];

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const fmt = (value: number) =>
    formatCurrencyWithCode(value, currencyCode, locale);

  const startDate = analytics.periodStart
    ? dateFormatter.format(analytics.periodStart)
    : "—";

  const endDate = analytics.periodEnd
    ? dateFormatter.format(analytics.periodEnd)
    : "—";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <AnalyticsPageShell
      title={tFinance("reportTitle")}
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: analyticsName },
        { label: tFinance("breadcrumb") },
      ]}
      triggerWrapperClassName="no-print"
      mainClassName="printable-area"
      beforeContent={
        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }

            .printable-area {
              display: block !important;
            }

            body {
              margin: 0;
              font-size: 12pt;
              line-height: 1.4;
            }

            table {
              border-collapse: collapse;
              page-break-inside: avoid;
            }

            tr {
              page-break-inside: avoid;
            }
          }
        `}</style>
      }
    >
      <PageHeading
        title={tFinance("heading")}
        description={tFinance("description")}
      />

          {/* ---------------------------------------------
           * KPI OVERVIEW (copied semantics from Matrix)
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{tFinance("overview.title")}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Period - only when GraphQL provides it */}
              {(analytics.periodStart ?? analytics.periodEnd) ? (
                <div className="border rounded-md p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{tFinance("overview.period.title")}</p>
                  <div className="text-sm">
                    <div>
                      <span className="text-muted-foreground">{tFinance("overview.period.start")}</span>{" "}
                      <span className="font-medium">{startDate}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{tFinance("overview.period.end")}</span>{" "}
                      <span className="font-medium">{endDate}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Items sold - from matrix */}
              {analytics.totalItemsSold != null ? (
                <div className="border rounded-md p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{tFinance("overview.itemsSold.title")}</p>
                  <div className="text-sm">
                    <span className="font-medium">
                      {analytics.totalItemsSold.toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Avg revenue/items per order - from GraphQL orderMetrics */}
              {analytics.avgOrderRevenue != null ? (
                <div className="border rounded-md p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {tFinance("overview.avgRevenuePerOrder")}
                  </p>
                  <div className="text-sm">
                    <span className="font-medium">{fmt(Number(analytics.avgOrderRevenue))}</span>
                  </div>
                </div>
              ) : null}
              {analytics.avgOrderItems != null ? (
                <div className="border rounded-md p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {tFinance("overview.avgItemsPerOrder")}
                  </p>
                  <div className="text-sm">
                    <span className="font-medium">{analytics.avgOrderItems.toFixed(2)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* ---------------------------------------------
           * PROFIT CALCULATION TABLE
           * --------------------------------------------- */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{tFinance("profit.title")}</h2>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tFinance("profit.table.metric")}</TableHead>
                    <TableHead className="text-right">{tFinance("profit.table.amount")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell>{tFinance("profit.table.totalRevenue")}</TableCell>
                    <TableCell className="text-right">
                      {fmt(totalRevenue)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>{tFinance("profit.table.totalCogs")}</TableCell>
                    <TableCell className="text-right">
                      {fmt(totalCogs)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>{tFinance("profit.table.totalProfit")}</TableCell>
                    <TableCell className="text-right">
                      {fmt(totalProfit)}
                    </TableCell>
                  </TableRow>

                  {fixedCosts.map((fc) => (
                    <TableRow key={fc.id}>
                      <TableCell>{fc.name}</TableCell>
                      <TableCell className="text-right">
                        {fmt(Number(fc.amount))}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow className="font-semibold">
                    <TableCell>{tFinance("profit.table.netProfit")}</TableCell>
                    <TableCell className="text-right">
                      {fmt(netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
    </AnalyticsPageShell>
  );
}
