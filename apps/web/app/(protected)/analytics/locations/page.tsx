export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { LocationsTable } from "./locations-table";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";

type LocationItem = { id: string; name: string };
type LocationsResponse = { data?: { locations: LocationItem[] }; errors?: unknown[] };

async function fetchLocations(): Promise<LocationItem[]> {
  const endpoint = process.env.GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error("GRAPHQL_ENDPOINT is not set");
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ locations { id name } }" }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }
  const json = (await res.json()) as LocationsResponse;
  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${JSON.stringify(json.errors)}`
    );
  }
  return json.data?.locations ?? [];
}

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  const branches = await fetchLocations();

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
