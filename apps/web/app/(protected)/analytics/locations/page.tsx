export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { LocationsTable } from "./locations-table";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { auth } from "@clerk/nextjs/server";
import { graphqlQuery } from "@/lib/graphql/client";
import { LOCATIONS_QUERY, type LocationsData } from "@/lib/graphql/queries";

async function fetchLocations(userId: string) {
  const data = await graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId);
  return data.locations;
}

export default async function Page() {
  const t = await getTranslations("analytics.branches");
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const branches = await fetchLocations(userId);

  return (
    <AnalyticsPageShell title={t("title")} breadcrumbs={[{ label: t("title") }]}>
      <PageHeading title={t("title")} description={t("description")} />

      <div className="flex justify-start">
        <Button asChild className="w-full sm:w-auto">
          <Link href={routes.analytics.branchesCreate}>{t("create")}</Link>
        </Button>
      </div>

      <LocationsTable
        branches={branches}
        indexLabel={t("table.index")}
        branchNameLabel={t("table.branchName")}
        emptyLabel={t("table.empty")}
      />
    </AnalyticsPageShell>
  );
}
