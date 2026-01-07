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

  // ✅ UNWRAP params (this is the key fix)
  const { analyticsId: analyticsIdParam } = await params;

  // 1️⃣ Validate param existence
  if (!analyticsIdParam) {
    notFound();
  }

  // 2️⃣ Parse analyticsId
  const analyticsId = Number(analyticsIdParam);

  // 3️⃣ Validate parse result
  if (!Number.isInteger(analyticsId)) {
    notFound();
  }

  // 4️⃣ Query menu items
  const rawMenuItems = await prisma.analyticsMenuItem.findMany({
    where: { analyticsId },
    orderBy: { menuName: "asc" },
    select: {
      id: true,
      menuName: true,
      cogs: true,
    },
  });

  // 5️⃣ Convert Prisma.Decimal → number
  const menuItems = rawMenuItems.map((item) => ({
    id: item.id,
    menuName: item.menuName,
    cogs: item.cogs ? Number(item.cogs) : null,
  }));

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("cogs.edit")} />

        <main className="mx-auto max-w-6xl p-4 space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.sales}>{t("sales.title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{t("cogs.edit")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <UpdateCogsForm analyticsId={analyticsId} menuItems={menuItems} />
        </main>
      </div>
    </SidebarInset>
  );
}
