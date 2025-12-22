import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";

import { CreateBranchForm } from "./create-branch-form";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import Link from "next/link";
import { routes } from "@/lib/routes";

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("create")} />

        <main className="mx-auto max-w-6xl p-4 space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.sales}>Analytics</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.branches}>{t("title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{t("create")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <CreateBranchForm />
        </main>
      </div>
    </SidebarInset>
  );
}
