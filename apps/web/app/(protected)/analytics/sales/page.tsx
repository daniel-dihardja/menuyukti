import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import UploadExcelClient from "./upload-xcel-client";
import { SalesTable } from "./sales-table";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

export const runtime = "nodejs";

export default async function Page() {
  const t = await getTranslations("analytics.sales");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  // still mocked for now
  const uploads = [
    { id: 1, name: "January_Analytics.xlsx" },
    { id: 2, name: "February_Analytics.xlsx" },
  ];

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("title")} />

        <main className="p-4 space-y-4 max-w-6xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <SalesTable
            branches={branches}
            uploads={uploads}
            labels={{
              index: t("table.index"),
              fileName: t("table.fileName"),
              action: t("table.action"),
              view: t("table.view"),
              selectBranch: "Pilih Cabang",
            }}
          />

          <div className="flex justify-center">
            <UploadExcelClient label={t("create")} />
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
