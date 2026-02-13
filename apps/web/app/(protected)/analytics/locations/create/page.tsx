import { getTranslations } from "next-intl/server";

import { CreateLocationForm } from "./create-location-form";
import { routes } from "@/lib/routes";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  return (
    <AnalyticsPageShell
      title={t("create")}
      breadcrumbs={[
        { label: t("title"), href: routes.analytics.branches },
        { label: t("create") },
      ]}
    >
      <PageHeading title={t("create")} description={t("createDescription")} />
      <CreateLocationForm />
    </AnalyticsPageShell>
  );
}
