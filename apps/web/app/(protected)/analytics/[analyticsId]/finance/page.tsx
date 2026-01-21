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
  const t = await getTranslations("analytics.sales");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  // --------------------------------------------------
  // Fetch analytics snapshot (REAL finance KPIs)
  // --------------------------------------------------
  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      sourceFile: true,

      // Context
      branchId: true,

      // Snapshot KPIs
      totalRevenue: true,
      totalCogs: true,
      totalProfit: true,
    },
  });

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;

  // --------------------------------------------------
  // Fetch branch fixed costs (REAL)
  // --------------------------------------------------
  const fixedCosts = await prisma.fixedCost.findMany({
    where: {
      branchId: analytics.branchId,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      amount: true,
    },
  });

  const totalFixedCosts = fixedCosts.reduce(
    (sum, fc) => sum + Number(fc.amount),
    0,
  );

  // --------------------------------------------------
  // Finance inputs (fully real now)
  // --------------------------------------------------
  const totalRevenue = Number(analytics.totalRevenue ?? 0);
  const totalCogs = Number(analytics.totalCogs ?? 0);
  const totalProfit = Number(analytics.totalProfit ?? 0);

  const netProfit = totalProfit - totalFixedCosts;

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------
  const locale = "id-ID";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  const fmt = (value: number) => currencyFormatter.format(value);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title="Finance Report" />

        <main className="p-4 space-y-8 max-w-6xl mx-auto">
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
                <BreadcrumbPage>{analyticsName}</BreadcrumbPage>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>Finance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page headline */}
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">Finance Summary</h1>
            <p className="text-sm text-muted-foreground">
              Profit calculation based on analytics snapshot and branch fixed
              costs
            </p>
          </header>

          {/* ---------------------------------------------
           * PROFIT CALCULATION TABLE
           * --------------------------------------------- */}
          <section className="border rounded-md p-6">
            <h2 className="text-lg font-semibold mb-4">Profit Calculation</h2>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell>Total Revenue</TableCell>
                    <TableCell className="text-right">
                      {fmt(totalRevenue)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Total COGS</TableCell>
                    <TableCell className="text-right">
                      {fmt(totalCogs)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Total Profit</TableCell>
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
                    <TableCell>Net Profit</TableCell>
                    <TableCell className="text-right">
                      {fmt(netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Content container */}
          <section className="border rounded-md p-6 min-h-[120px]">
            <p className="text-sm text-muted-foreground">
              Fixed costs are now pulled from branch configuration and applied
              live to the analytics snapshot.
            </p>
          </section>
        </main>
      </div>
    </SidebarInset>
  );
}
