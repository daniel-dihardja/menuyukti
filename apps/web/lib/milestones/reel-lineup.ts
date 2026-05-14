import type {
  MenuTaggerItem,
  ReelLineupGroup,
  ReelLineupMilestoneData,
} from '@/lib/graphql/node-schemas'

import {
  REEL_LINEUP_MAX_LEADS,
  REEL_LINEUP_PROFILE_ID,
  isMainCourseStrongStoryItem,
} from '@/lib/milestones/reel-lineup-rules'

export const EMPTY_REEL_LINEUP_DATA: ReelLineupMilestoneData = {
  groups: [],
  unassignedItemNames: [],
}

function finalizeLeadGroup(item: MenuTaggerItem, index: number): ReelLineupGroup {
  const groupItem = {
    name: item.name,
    role: item.role,
    category: item.category,
    position: 1 as const,
    storytellingFit: item.storytellingFit,
    reelMoment: item.tags.reel_moment,
    ...(typeof item.popularity === 'number' ? { popularity: item.popularity } : {}),
  }

  return {
    id: `group-${index + 1}`,
    leadName: item.name,
    profileId: REEL_LINEUP_PROFILE_ID,
    anchor: { dimension: 'reel_moment', value: item.tags.reel_moment },
    items: [groupItem],
    mix: {
      priceLevels: [],
      storytellingStrongCount: 1,
      starCount: item.role === 'star' ? 1 : 0,
      puzzleCount: item.role === 'puzzle' ? 1 : 0,
    },
  }
}

/** Pick up to five main-course food items with strong storytelling as Reel hook leads (menu tagger order). */
export function buildReelLineup(
  menuTaggerItems: MenuTaggerItem[],
  options?: {
    sourceMenuTaggerTitle?: string
    notes?: string
  },
): ReelLineupMilestoneData {
  const leads = menuTaggerItems.filter(isMainCourseStrongStoryItem).slice(0, REEL_LINEUP_MAX_LEADS)

  const leadNames = new Set(leads.map((item) => item.name))
  const unassignedItemNames = menuTaggerItems
    .map((item) => item.name)
    .filter((name) => !leadNames.has(name))

  const groups = leads.map((item, index) => finalizeLeadGroup(item, index))

  const sourceMenuTaggerTitle = options?.sourceMenuTaggerTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    groups,
    unassignedItemNames,
    ...(sourceMenuTaggerTitle ? { sourceMenuTaggerTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
