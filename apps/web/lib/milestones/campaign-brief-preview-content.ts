import type { CampaignBriefMilestoneData } from '@/lib/graphql/node-schemas'

const PLACEHOLDER_MAIN_CATEGORY = '(uncategorized)'

function hasTrimmed(value: string): boolean {
  return value.trim().length > 0
}

export function hasCampaignBriefVenueSnapshotContent(
  venueSnapshot: CampaignBriefMilestoneData['venueSnapshot'],
): boolean {
  return (
    hasTrimmed(venueSnapshot.venueName) ||
    hasTrimmed(venueSnapshot.city) ||
    hasTrimmed(venueSnapshot.country) ||
    hasTrimmed(venueSnapshot.currency)
  )
}

export function hasCampaignBriefOverallStrategyContent(
  strategy: CampaignBriefMilestoneData['overallStrategy'],
): boolean {
  if (!strategy) {
    return false
  }
  return (
    hasTrimmed(strategy.strategyFocus) ||
    hasTrimmed(strategy.coreMessage) ||
    hasTrimmed(strategy.offerWindow) ||
    (strategy.audiencePriority?.length ?? 0) > 0 ||
    (strategy.cadenceGuidance?.length ?? 0) > 0
  )
}

export function hasCampaignBriefListContent(items: string[]): boolean {
  return items.length > 0
}

/** True when the milestone has generated brief content worth showing in the preview panel. */
export function hasCampaignBriefPreviewContent(data: CampaignBriefMilestoneData): boolean {
  if (hasCampaignBriefVenueSnapshotContent(data.venueSnapshot)) {
    return true
  }
  if (hasCampaignBriefOverallStrategyContent(data.overallStrategy)) {
    return true
  }
  if (hasTrimmed(data.campaignObjective)) {
    return true
  }
  if (hasTrimmed(data.mainCategory) && data.mainCategory !== PLACEHOLDER_MAIN_CATEGORY) {
    return true
  }
  return [
    data.contentPillars,
    data.audienceHypotheses,
    data.proofOrientedAngles,
    data.toneGuardrails,
    data.targetSegments,
    data.messageHierarchy,
    data.offerAndCtaPlan,
    data.contentPillarPlan,
    data.measurementPlan,
    data.testingPlan,
    data.riskGuardrails,
  ].some(hasCampaignBriefListContent)
}
