export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { AnalyticsSalesClient } from "./analytics-sales-client";

export default async function Page() {
  const t = await getTranslations("analytics.sales");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  const hasBranches = branches.length > 0;

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("title")} />

        <main className="p-4 space-y-8 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* ---------------------------------------------
           * HERO HEADER (Marketing positioning)
           * --------------------------------------------- */}
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Transform Sales Data into Marketing Wins
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Upload your restaurant sales report and let Menuyukti reveal
              customer behavior patterns, menu performance insights, and
              AI-powered recommendations to boost revenue and optimize your
              promotions.
            </p>
          </header>

          {/* ---------------------------------------------
           * PRIMARY CTA CARD
           * --------------------------------------------- */}
          {hasBranches && (
            <Card className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/30 border-dashed">
              <div className="space-y-1">
                <h2 className="text-lg font-medium">
                  Upload a Sales Report to Get AI Insights
                </h2>
                <p className="text-sm text-muted-foreground">
                  Supported format: Excel (.xlsx). We’ll analyze your data to
                  uncover growth opportunities and marketing insights.
                </p>
              </div>

              <Button asChild size="lg">
                <Link href={routes.analytics.sales}>Upload Sales Report</Link>
              </Button>
            </Card>
          )}

          {/* ---------------------------------------------
           * VALUE PREVIEW (Marketing outcomes)
           * --------------------------------------------- */}
          {hasBranches && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Top Menu Opportunities",
                  desc: "Identify bestsellers, hidden gems, and underperformers for targeted promotions.",
                },
                {
                  title: "Customer Behavior Patterns",
                  desc: "See peak hours and weekly trends to time your campaigns perfectly.",
                },
                {
                  title: "Profit & Pricing Insights",
                  desc: "Understand margins, pricing gaps, and cost efficiency by menu item.",
                },
                {
                  title: "AI Marketing Recommendations",
                  desc: "Get actionable suggestions for bundling, discounts, and upselling.",
                },
              ].map((item) => (
                <Card key={item.title} className="p-4 space-y-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              ))}
            </section>
          )}

          {/* ---------------------------------------------
           * MAIN CONTENT
           * --------------------------------------------- */}
          {!hasBranches ? (
            /* Empty state: no branches */
            <Card className="p-10 text-center space-y-4">
              <h2 className="text-xl font-medium">{t("noBranches.title")}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("noBranches.description")}
              </p>
              <Button asChild size="lg">
                <Link href={routes.analytics.branchesCreate}>
                  {t("noBranches.cta")}
                </Link>
              </Button>
            </Card>
          ) : (
            /* Interactive analytics UI */
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                Your Sales Intelligence Dashboard
              </h2>
              <p className="text-sm text-muted-foreground">
                Select a branch and explore AI-driven marketing insights from
                your uploaded sales reports.
              </p>

              <AnalyticsSalesClient branches={branches} />
            </section>
          )}
        </main>
      </div>
    </SidebarInset>
  );
}
