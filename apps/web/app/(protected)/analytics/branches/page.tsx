import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
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
import { prisma } from "@/lib/prisma/client";
import { BranchesTable } from "./branches-table";

export const runtime = "nodejs";

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("title")} />

        <main className="p-4 space-y-3 max-w-6xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.sales}>Analytics</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{t("title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <BranchesTable
            branches={branches}
            indexLabel={t("table.index")}
            branchNameLabel={t("table.branchName")}
            actionLabel={t("table.action")}
            emptyLabel={t("table.empty")}
          />

          <div className="flex justify-end">
            <Button asChild>
              <Link href={routes.analytics.branchesCreate}>{t("create")}</Link>
            </Button>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
