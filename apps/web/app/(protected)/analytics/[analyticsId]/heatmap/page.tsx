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

// Server-safe adapters ONLY
import {
  adaptDailyHeatmapMatrix,
  type DailyHeatmapInput,
} from "./heatmap.adapters";

// Client UI component ONLY
import { HeatmapMatrix } from "./heatmap-matrix";

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
  // Fetch analytics snapshot (breadcrumb + heatmap)
  // --------------------------------------------------
  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      sourceFile: true,
      heatmapJson: true,
    },
  });

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;

  // --------------------------------------------------
  // Parse + validate heatmap_json
  // --------------------------------------------------
  let heatmapItems: DailyHeatmapInput[] = [];

  try {
    const raw = analytics.heatmapJson as unknown;

    if (!Array.isArray(raw)) {
      throw new Error("heatmap_json is not an array");
    }

    heatmapItems = raw.filter(
      (item: any): item is DailyHeatmapInput =>
        typeof item?.menu === "string" &&
        Array.isArray(item?.dailyHeatmap) &&
        item.dailyHeatmap.every(
          (h: any) =>
            typeof h?.hour === "string" && typeof h?.quantity === "number",
        ),
    );
  } catch (err) {
    console.error("Invalid heatmap_json:", err);
    notFound();
  }

  if (heatmapItems.length === 0) {
    notFound();
  }

  // --------------------------------------------------
  // Dynamic hour window (UI-ready)
  // --------------------------------------------------
  const START_HOUR = 8;
  const END_HOUR = 18;

  const { rows, columnLabels } = adaptDailyHeatmapMatrix(
    heatmapItems,
    START_HOUR,
    END_HOUR,
  );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title="Heatmaps" />

        <main className="p-4 max-w-7xl mx-auto space-y-8">
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
                <BreadcrumbPage>Heatmaps</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page headline */}
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">Menu Sales Heatmap</h1>
            <p className="text-sm text-muted-foreground">
              Sales volume by hour and menu item ({START_HOUR}:00 – {END_HOUR}
              :00)
            </p>
          </header>

          {/* ---------------------------------------------
           * HEATMAP MATRIX (client component)
           * --------------------------------------------- */}
          <section className="space-y-4">
            <HeatmapMatrix
              title="Hourly Sales Heatmap"
              rows={rows}
              columnLabels={columnLabels}
              color="blue"
            />
          </section>
        </main>
      </div>
    </SidebarInset>
  );
}
