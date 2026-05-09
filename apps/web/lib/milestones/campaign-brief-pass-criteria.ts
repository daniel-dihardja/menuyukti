/**
 * Single source of truth for Campaign brief (`restaurant_campaign_brief`) pass criteria
 * order and slug ids — used when seeding milestones and for preview help tooltips.
 */

export const CAMPAIGN_BRIEF_PASS_CRITERION_SLUGS = [
  'venueSnapshot',
  'contentPillars',
  'audienceHypotheses',
  'proofOrientedAngles',
  'toneGuardrails',
  'campaignObjective',
  'targetSegments',
  'messageHierarchy',
  'offerAndCtaPlan',
  'contentPillarPlan',
  'measurementPlan',
  'testingPlan',
  'riskGuardrails',
] as const

export type CampaignBriefPassCriterionSlug = (typeof CAMPAIGN_BRIEF_PASS_CRITERION_SLUGS)[number]

const SLUG_TO_CRITERION_KEY = {
  venueSnapshot: 'milestonePreset.restaurant_campaign_brief.criterionVenueSnapshot',
  contentPillars: 'milestonePreset.restaurant_campaign_brief.criterionContentPillars',
  audienceHypotheses: 'milestonePreset.restaurant_campaign_brief.criterionAudienceHypotheses',
  proofOrientedAngles: 'milestonePreset.restaurant_campaign_brief.criterionProofAngles',
  toneGuardrails: 'milestonePreset.restaurant_campaign_brief.criterionToneGuardrails',
  campaignObjective: 'milestonePreset.restaurant_campaign_brief.criterionCampaignObjective',
  targetSegments: 'milestonePreset.restaurant_campaign_brief.criterionTargetSegments',
  messageHierarchy: 'milestonePreset.restaurant_campaign_brief.criterionMessageHierarchy',
  offerAndCtaPlan: 'milestonePreset.restaurant_campaign_brief.criterionOfferAndCtaPlan',
  contentPillarPlan: 'milestonePreset.restaurant_campaign_brief.criterionContentPillarPlan',
  measurementPlan: 'milestonePreset.restaurant_campaign_brief.criterionMeasurementPlan',
  testingPlan: 'milestonePreset.restaurant_campaign_brief.criterionTestingPlan',
  riskGuardrails: 'milestonePreset.restaurant_campaign_brief.criterionRiskGuardrails',
} as const satisfies Record<CampaignBriefPassCriterionSlug, string>

/** Pass criteria rows for a newly created Campaign brief milestone (matches prior seed order). */
export function buildCampaignBriefPassCriteriaSeed(
  t: (key: string) => string,
): { requirement: string; status: 'open' }[] {
  return CAMPAIGN_BRIEF_PASS_CRITERION_SLUGS.map((slug) => ({
    requirement: t(SLUG_TO_CRITERION_KEY[slug]),
    status: 'open' as const,
  }))
}
