export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routes } from "@/lib/routes";
import { AnalyticsPageShell } from "@/components/analytics-page-shell";
import { AiChatPanel } from "../create/ai-chat-panel";
import type { PlanningArtifact } from "../create/ai-artifact-panel";
import { graphqlQuery } from "@/lib/graphql/client";
import {
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  CAMPAIGN_BRIEF_QUERY,
  CAMPAIGN_DETAIL_QUERY,
  LOCATION_PROFILE_QUERY,
  type AnalyticsRunsByLocationData,
  type CampaignBriefData,
  type CampaignDetailData,
  type LocationProfileData,
} from "@/lib/graphql/queries";
import { parsePostScheduleJson } from "../parse-post-schedule";

type PageProps = {
  params: Promise<{ id: string }>;
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

function buildInitialPlanning(
  campaign: NonNullable<CampaignDetailData["campaign"]>,
  brief: CampaignBriefData["campaignBrief"],
  fallbackDates: { dateStart: string; dateEnd: string },
  locationSummary: string | null,
  locationProfileId?: number | null
): Partial<PlanningArtifact> {
  const dateStart = campaign.startDate ?? fallbackDates.dateStart;
  const dateEnd = campaign.endDate ?? fallbackDates.dateEnd;

  if (!brief) {
    return {
      dateStart,
      dateEnd,
      locationSummary,
      locationProfileId,
      nationalHolidays: undefined,
      campaignBrief: null,
    };
  }

  const postSlots = parsePostScheduleJson(brief.postScheduleJson);

  return {
    dateStart,
    dateEnd,
    locationSummary,
    locationProfileId,
    nationalHolidays: undefined,
    campaignBrief: {
      campaign_theme: brief.campaignTheme,
      tone: brief.tone,
      target_audience: brief.targetAudience,
      posting_cadence: brief.postingCadence,
      post_slots: postSlots,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const { id: rawId } = await params;
  const campaignIdNum = Number(rawId);
  if (!Number.isInteger(campaignIdNum) || campaignIdNum <= 0) {
    notFound();
  }

  const campaignIdStr = String(campaignIdNum);

  const tCampaigns = await getTranslations("analytics.campaigns");

  const fallbackDates = computeDefaultDates();

  let campaignData: CampaignDetailData;
  let briefData: CampaignBriefData;
  try {
    [campaignData, briefData] = await Promise.all([
      graphqlQuery<CampaignDetailData>(
        CAMPAIGN_DETAIL_QUERY,
        { id: campaignIdStr },
        userId
      ),
      graphqlQuery<CampaignBriefData>(
        CAMPAIGN_BRIEF_QUERY,
        { campaignId: campaignIdStr },
        userId
      ),
    ]);
  } catch {
    notFound();
  }

  const campaign = campaignData.campaign;
  if (!campaign) {
    notFound();
  }

  const locationId = Number(campaign.locationId);
  if (!Number.isInteger(locationId)) {
    notFound();
  }

  const briefForProfile = briefData.campaignBrief;
  const canLoadProfile =
    briefForProfile != null &&
    briefForProfile.analyticsRunId != null &&
    Number.isFinite(Number(briefForProfile.analyticsRunId));

  const [profileData, runsData] = await Promise.all([
    canLoadProfile
      ? graphqlQuery<LocationProfileData>(
          LOCATION_PROFILE_QUERY,
          {
            locationId: String(locationId),
            analyticsRunId: String(briefForProfile!.analyticsRunId),
          },
          userId
        ).catch(() => null)
      : Promise.resolve<LocationProfileData | null>(null),
    graphqlQuery<AnalyticsRunsByLocationData>(
      ANALYTICS_RUNS_BY_LOCATION_QUERY,
      { locationId },
      userId
    ).catch(() => ({ analyticsRuns: [] as AnalyticsRunsByLocationData["analyticsRuns"] })),
  ]);

  const rawSummary = profileData?.locationProfile?.summary?.trim();
  const locationSummary =
    rawSummary && rawSummary.length > 0 ? rawSummary : null;
  const locationProfileId = profileData?.locationProfile?.id
    ? parseInt(profileData.locationProfile.id, 10)
    : undefined;

  const analyticsRuns = runsData.analyticsRuns;

  const initialPlanning = buildInitialPlanning(
    campaign,
    briefData.campaignBrief,
    fallbackDates,
    locationSummary,
    locationProfileId
  );

  const brief = briefData.campaignBrief;
  const initialAnalyticsId =
    brief != null && brief.analyticsRunId != null
      ? Number(brief.analyticsRunId)
      : null;

  const defaultDates = {
    dateStart: campaign.startDate ?? fallbackDates.dateStart,
    dateEnd: campaign.endDate ?? fallbackDates.dateEnd,
  };

  return (
    <AnalyticsPageShell
      title={campaign.name}
      breadcrumbs={[
        { label: tCampaigns("title"), href: routes.campaigns.list },
        { label: campaign.name },
      ]}
      mainClassName="max-w-none w-full h-[calc(100vh-4rem)] min-h-[24rem]"
    >
      <AiChatPanel
        locationId={locationId}
        analyticsRuns={analyticsRuns}
        defaultDates={defaultDates}
        initialPlanning={initialPlanning}
        initialAnalyticsId={initialAnalyticsId}
        campaignId={campaignIdNum}
      />
    </AnalyticsPageShell>
  );
}
