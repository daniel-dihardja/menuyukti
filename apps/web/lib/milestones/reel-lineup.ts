import type {
  MenuTaggerItem,
  ReelLineupGroup,
  ReelLineupMilestoneData,
} from '@/lib/graphql/node-schemas'

import {
  REEL_LINEUP_MAX_DRINK_LEADS,
  REEL_LINEUP_MAX_LEADS,
  REEL_LINEUP_PROFILE_ID,
  isBeverageDrinkItem,
  isMainCourseStrongStoryItem,
} from '@/lib/milestones/reel-lineup-rules'

export const EMPTY_REEL_LINEUP_DATA: ReelLineupMilestoneData = {
  foodLeads: [],
  drinkLeads: [],
  groups: [],
  drinkGroups: [],
  unassignedItemNames: [],
}

function finalizeLeadGroup(
  item: MenuTaggerItem,
  index: number,
  idPrefix: 'group' | 'drink-group',
): ReelLineupGroup {
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
    id: `${idPrefix}-${index + 1}`,
    leadName: item.name,
    profileId: REEL_LINEUP_PROFILE_ID,
    anchor: { dimension: 'reel_moment', value: item.tags.reel_moment },
    items: [groupItem],
    mix: {
      priceLevels: [],
      storytellingStrongCount: item.storytellingFit === 'strong' ? 1 : 0,
      starCount: item.role === 'star' ? 1 : 0,
      puzzleCount: item.role === 'puzzle' ? 1 : 0,
    },
  }
}

/** Pick food and drink Reel hook leads from menu tagger items (menu tagger order preserved). */
export function buildReelLineup(
  menuTaggerItems: MenuTaggerItem[],
  options?: {
    sourceMenuTaggerTitle?: string
    notes?: string
  },
): ReelLineupMilestoneData {
  const foodLeads = menuTaggerItems
    .filter(isMainCourseStrongStoryItem)
    .slice(0, REEL_LINEUP_MAX_LEADS)

  const drinkLeads = menuTaggerItems
    .filter(isBeverageDrinkItem)
    .slice(0, REEL_LINEUP_MAX_DRINK_LEADS)

  const assignedNames = new Set([...foodLeads, ...drinkLeads].map((item) => item.name))
  const unassignedItemNames = menuTaggerItems
    .map((item) => item.name)
    .filter((name) => !assignedNames.has(name))

  const groups = foodLeads.map((item, index) => finalizeLeadGroup(item, index, 'group'))
  const drinkGroups = drinkLeads.map((item, index) => finalizeLeadGroup(item, index, 'drink-group'))

  const sourceMenuTaggerTitle = options?.sourceMenuTaggerTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    foodLeads,
    drinkLeads,
    groups,
    drinkGroups,
    unassignedItemNames,
    ...(sourceMenuTaggerTitle ? { sourceMenuTaggerTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
