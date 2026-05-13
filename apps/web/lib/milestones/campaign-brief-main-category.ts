import { campaignBriefMilestoneDataSchema } from '@/lib/graphql/node-schemas'

import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'

/** Top-revenue POS category from the first campaign brief milestone in the workflow. */
export function extractCampaignBriefMainCategory(milestones: TimelineMilestone[]): string | null {
  for (const milestone of milestones) {
    if (milestone.presetId !== 'restaurant_campaign_brief') {
      continue
    }
    const parsed = campaignBriefMilestoneDataSchema.safeParse(milestone.data)
    if (!parsed.success) {
      continue
    }
    const name = parsed.data.mainCategory.trim()
    if (name) {
      return name
    }
  }
  return null
}
