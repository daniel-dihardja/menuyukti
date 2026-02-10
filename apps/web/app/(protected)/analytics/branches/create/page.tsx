import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";

import { CreateBranchForm } from "./create-branch-form";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import Link from "next/link";
import { routes } from "@/lib/routes";

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient
          title={t("create")}
          breadcrumbs={[
            { label: t("title"), href: routes.analytics.branches },
            { label: t("create") },
          ]}
        />

        <main className="mx-auto max-w-6xl p-4 space-y-3">

          <CreateBranchForm />
        </main>
      </div>
    </SidebarInset>
  );
}
