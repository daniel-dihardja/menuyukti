export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { graphqlQuery } from "@/lib/graphql/client";
import { LOCATIONS_QUERY, type LocationsData } from "@/lib/graphql/queries";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { CampaignsClient } from "./campaigns-client";

export default async function Page() {
  const t = await getTranslations("analytics.campaigns");

  const data = await graphqlQuery<LocationsData>(LOCATIONS_QUERY);
  const branches = data.locations.map((loc) => ({
    id: Number(loc.id),
    name: loc.name,
  }));

  const hasBranches = branches.length > 0;

  return (
    <AnalyticsPageShell title={t("title")} breadcrumbs={[{ label: t("title") }]}>
      <PageHeading title={t("title")} description={t("description")} />

      {!hasBranches ? (
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-lg font-medium">{t("noBranches.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t("noBranches.description")}
          </p>
          <Button asChild size="lg">
            <Link href={routes.analytics.branchesCreate}>
              {t("noBranches.cta")}
            </Link>
          </Button>
        </Card>
      ) : (
        <section className="space-y-3">
          <CampaignsClient branches={branches} />
        </section>
      )}
    </AnalyticsPageShell>
  );
}
