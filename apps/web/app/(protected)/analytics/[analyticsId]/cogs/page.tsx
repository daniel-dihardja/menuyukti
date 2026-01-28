export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UpdateCogsForm } from "./update-cogs-form";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { routes } from "@/lib/routes";
import { prisma } from "@/lib/prisma/client";

type PageProps = {
  params: Promise<{
    analyticsId?: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const t = await getTranslations("analytics");

  // --------------------------------------------------
  // Params
  // --------------------------------------------------
  const { analyticsId: analyticsIdParam } = await params;
  if (!analyticsIdParam) notFound();

  const analyticsId = Number(analyticsIdParam);
  if (!Number.isInteger(analyticsId)) notFound();

  // --------------------------------------------------
  // Fetch analytics (for breadcrumb name)
  // --------------------------------------------------
  const analytics = await prisma.analytics.findUnique({
    where: { id: analyticsId },
    select: {
      sourceFile: true,
    },
  });

  if (!analytics) notFound();

  const analyticsName = analytics.sourceFile ?? `Analytics #${analyticsId}`;

  // --------------------------------------------------
  // Fetch menu items
  // --------------------------------------------------
  const rawMenuItems = await prisma.analyticsMenuItem.findMany({
    where: { analyticsId },
    orderBy: { quantity: "desc" },
    select: {
      id: true,
      menuName: true,
      cogs: true,
      quantity: true,
      totalRevenue: true,
      menuCategory: true,
    },
  });

  const menuItems = rawMenuItems.map((item) => ({
    id: item.id,
    menuName: item.menuName,
    cogs: item.cogs ? Number(item.cogs) : 0,
    quantity: item.quantity,
    totalRevenue: Number(item.totalRevenue),
    menuCategory: item.menuCategory,
  }));

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("cogs.edit")} />

        <main className="mx-auto max-w-6xl p-4 space-y-3">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.sales}>{t("sales.title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{analyticsName}</BreadcrumbPage>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{t("cogs.title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <UpdateCogsForm analyticsId={analyticsId} menuItems={menuItems} />
        </main>
      </div>
    </SidebarInset>
  );
}
