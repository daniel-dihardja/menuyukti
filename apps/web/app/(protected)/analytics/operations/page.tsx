export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma/client";
import { routes } from "@/lib/routes";

import { OperationsClient } from "./operations-client";

export default async function OperationsPage() {
  const tSales = await getTranslations("analytics.sales");

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <AnalyticsPageShell
      title="Pipeline Operations"
      breadcrumbs={[
        { label: tSales("title"), href: routes.analytics.sales },
        { label: "Operations" },
      ]}
    >
      <PageHeading
        title="Pipeline Operations"
        description="Trigger retry, replay, or backfill actions and track operation status."
      />
      <OperationsClient
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
        }))}
      />
    </AnalyticsPageShell>
  );
}
