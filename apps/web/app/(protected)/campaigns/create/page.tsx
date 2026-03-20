export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { AiChatPanel } from "./ai-chat-panel";
import { graphqlQuery } from "@/lib/graphql/client";
import { ANALYTICS_RUN_QUERY, type AnalyticsRunData } from "@/lib/graphql/queries";

type PageProps = {
  searchParams: Promise<{ analyticsId?: string; locationId?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const tCampaigns = await getTranslations("analytics.campaigns");
  const tAi = await getTranslations("analytics.ai");

  const { analyticsId: analyticsIdParam, locationId: locationIdParam } =
    await searchParams;

  let analyticsId: number | undefined;
  let locationId: number;

  if (analyticsIdParam) {
    analyticsId = Number(analyticsIdParam);
    if (!Number.isInteger(analyticsId) || isNaN(analyticsId)) notFound();

    const data = await graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, {
      id: String(analyticsId),
    });
    const run = data.analyticsRun;
    if (!run) notFound();
    locationId = run.locationId;
  } else if (locationIdParam) {
    locationId = Number(locationIdParam);
    if (!Number.isInteger(locationId) || isNaN(locationId)) notFound();
  } else {
    notFound();
  }

  return (
    <AnalyticsPageShell
      title={tAi("reportTitle")}
      breadcrumbs={[
        { label: tCampaigns("title"), href: routes.campaigns.list },
        { label: tAi("breadcrumb") },
      ]}
      mainClassName="max-w-none w-full h-[calc(100vh-4rem)] min-h-[24rem]"
    >
      <AiChatPanel analyticsId={analyticsId} locationId={locationId} />
    </AnalyticsPageShell>
  );
}
