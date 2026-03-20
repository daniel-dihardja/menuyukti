export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { AiChatPanel } from "./ai-chat-panel";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  LOCATION_PROFILE_QUERY,
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  type LocationProfileData,
  type AnalyticsRunsByLocationData,
} from "@/lib/graphql/queries";

type PageProps = {
  searchParams: Promise<{ locationId?: string }>;
};

function computeDefaultDates(): { dateStart: string; dateEnd: string } {
  const today = new Date();
  const y =
    today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const m = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    dateStart: `${y}-${pad(m + 1)}-01`,
    dateEnd: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  };
}

export default async function Page({ searchParams }: PageProps) {
  const tCampaigns = await getTranslations("analytics.campaigns");
  const tAi = await getTranslations("analytics.ai");

  const { locationId: locationIdParam } = await searchParams;

  if (!locationIdParam) notFound();

  const locationId = Number(locationIdParam);
  if (!Number.isInteger(locationId) || isNaN(locationId)) notFound();

  const defaultDates = computeDefaultDates();

  let initialLocationSummary: string | null = null;
  let analyticsRuns: Array<{ id: string; name: string; filename: string }> = [];
  try {
    const runsData = await graphqlQuery<AnalyticsRunsByLocationData>(
      ANALYTICS_RUNS_BY_LOCATION_QUERY,
      { locationId: locationId }
    );
    analyticsRuns = runsData.analyticsRuns;

    const profileData = await graphqlQuery<LocationProfileData>(
      LOCATION_PROFILE_QUERY,
      { locationId: String(locationId), analyticsRunId: "0" }
    );
    initialLocationSummary = profileData.locationProfile?.summary ?? null;
  } catch {
    // If any fetch fails, fall through with null — the button will still show
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
      <AiChatPanel
        locationId={locationId}
        initialLocationSummary={initialLocationSummary}
        analyticsRuns={analyticsRuns}
        defaultDates={defaultDates}
      />
    </AnalyticsPageShell>
  );
}
