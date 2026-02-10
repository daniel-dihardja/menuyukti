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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

// Server-safe adapters
import {
  adaptDailyHeatmapMatrix,
  adaptWeeklyHeatmapMatrix,
  type DailyHeatmapInput,
  type WeeklyHeatmapInput,
} from "./heatmap.adapters";

// Client UI component
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
  // Fetch analytics snapshot
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
  let dailyItems: DailyHeatmapInput[] = [];
  let weeklyItems: WeeklyHeatmapInput[] = [];

  try {
    const raw = analytics.heatmapJson as unknown;

    if (!Array.isArray(raw)) {
      throw new Error("heatmap_json is not an array");
    }

    dailyItems = raw.filter(
      (item: any): item is DailyHeatmapInput =>
        typeof item?.menu === "string" && Array.isArray(item?.dailyHeatmap),
    );

    weeklyItems = raw.filter(
      (item: any): item is WeeklyHeatmapInput =>
        typeof item?.menu === "string" && Array.isArray(item?.weeklyHeatmap),
    );
  } catch (err) {
    console.error("Invalid heatmap_json:", err);
    notFound();
  }

  if (!dailyItems.length && !weeklyItems.length) {
    notFound();
  }

  // --------------------------------------------------
  // Daily window (UI-ready)
  // --------------------------------------------------
  const START_HOUR = 8;
  const END_HOUR = 18;

  const daily = adaptDailyHeatmapMatrix(dailyItems, START_HOUR, END_HOUR);

  const weekly = adaptWeeklyHeatmapMatrix(weeklyItems);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title="Heatmaps"
          breadcrumbs={[
            { label: t("title"), href: routes.analytics.sales },
            { label: analyticsName },
            { label: "Heatmaps" },
          ]}
        />

        <main className="p-4 max-w-7xl mx-auto space-y-8">

          {/* Page headline */}
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold">Menu Sales Heatmap</h1>
            <p className="text-sm text-muted-foreground">
              Visualize sales volume by menu and time
            </p>
          </header>

          {/* ---------------------------------------------
           * HEATMAP TABS
           * --------------------------------------------- */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>

            {/* DAILY */}
            <TabsContent value="daily">
              <HeatmapMatrix
                title={`Hourly Sales (${START_HOUR}:00 – ${END_HOUR}:00)`}
                rows={daily.rows}
                columnLabels={daily.columnLabels}
                color="green"
              />
            </TabsContent>

            {/* WEEKLY */}
            <TabsContent value="weekly">
              <HeatmapMatrix
                title="Weekly Sales (Mon–Fri)"
                rows={weekly.rows}
                columnLabels={weekly.columnLabels}
                color="green"
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarInset>
  );
}
