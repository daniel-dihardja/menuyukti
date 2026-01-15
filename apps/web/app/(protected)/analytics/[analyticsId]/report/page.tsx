export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

type PageProps = {
  params: Promise<{
    analyticsId?: string;
  }>;
};

type MatrixDistributionItem = {
  category: "star" | "plow_horse" | "puzzle" | "low_end";
  count: number;
  percentage: number;
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
      periodStart: true,
      periodEnd: true,
      totalOrders: true,
      totalItemsSold: true,
      avgOrderRevenue: true,
      avgOrderItems: true,
      matrixDistributionJson: true,
    },
  });

  if (!analytics) notFound();

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------
  const locale = "id-ID";
  const currency = "IDR";

  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const startDate = analytics.periodStart
    ? analytics.periodStart.toLocaleDateString(locale)
    : "—";

  const endDate = analytics.periodEnd
    ? analytics.periodEnd.toLocaleDateString(locale)
    : "—";

  const totalOrders =
    typeof analytics.totalOrders === "number"
      ? analytics.totalOrders.toLocaleString(locale)
      : "—";

  const totalItemsSold =
    typeof analytics.totalItemsSold === "number"
      ? analytics.totalItemsSold.toLocaleString(locale)
      : "—";

  const avgOrderRevenue =
    analytics.avgOrderRevenue !== null
      ? currencyFormatter.format(Number(analytics.avgOrderRevenue))
      : "—";

  const avgOrderItems =
    analytics.avgOrderItems !== null
      ? Number(analytics.avgOrderItems).toFixed(2)
      : "—";

  const distribution: MatrixDistributionItem[] =
    (analytics.matrixDistributionJson as MatrixDistributionItem[]) ?? [];

  const byCategory = (category: MatrixDistributionItem["category"]) =>
    distribution.find((d) => d.category === category);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title="Report" />

        <main className="p-4 space-y-6 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.sales}>{t("title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Report</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* ---------------------------------------------
           * KPI cards (existing)
           * --------------------------------------------- */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Period */}
            <div className="border rounded-md p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Period</p>
              <div className="text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>{" "}
                  <span className="font-medium">{startDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>{" "}
                  <span className="font-medium">{endDate}</span>
                </div>
              </div>
            </div>

            {/* Orders & Items */}
            <div className="border rounded-md p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Orders & Items</p>
              <div className="text-sm">
                <div>
                  <span className="text-muted-foreground">Total Orders:</span>{" "}
                  <span className="font-medium">{totalOrders}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Total Items Sold:
                  </span>{" "}
                  <span className="font-medium">{totalItemsSold}</span>
                </div>
              </div>
            </div>

            {/* Averages */}
            <div className="border rounded-md p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Averages</p>
              <div className="text-sm">
                <div>
                  <span className="text-muted-foreground">
                    Avg Order Revenue:
                  </span>{" "}
                  <span className="font-medium">{avgOrderRevenue}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Avg Order Items:
                  </span>{" "}
                  <span className="font-medium">{avgOrderItems}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------
           * Matrix Distribution KPIs
           * --------------------------------------------- */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        {item ? item.count : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Share:</span>{" "}
                      <span className="font-medium">
                        {item ? `${(item.percentage * 100).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      </div>
    </SidebarInset>
  );
}
