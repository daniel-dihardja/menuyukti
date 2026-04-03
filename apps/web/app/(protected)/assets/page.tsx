export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";

import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { AssetsClient } from "./assets-client";

export default async function Page() {
  const t = await getTranslations("assets");
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return (
    <AnalyticsPageShell
      title={t("title")}
      breadcrumbs={[{ label: t("title") }]}
      mainClassName="max-w-none w-full p-0 space-y-0"
      triggerWrapperClassName="px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="space-y-8">
        <div className="px-4 sm:px-6 lg:px-8 pt-2">
          <PageHeading title={t("title")} description={t("description")} />
        </div>
        <AssetsClient />
      </div>
    </AnalyticsPageShell>
  );
}
