import type { MenuClustererGroup, ReelLineupMilestoneData } from '@/lib/graphql/node-schemas'
import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'

import { type CampaignWeek, campaignWeeks } from '@/lib/milestones/dates-window'

export const REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX = 'weekday-reel-week-'
export const REEL_LINEUP_WEEKEND_REEL_ID_PREFIX = 'weekend-reel-week-'

export const EMPTY_REEL_LINEUP_DATA: ReelLineupMilestoneData = {
  reels: [],
}

/** Parse persisted/API reel lineup payload; returns null when missing or invalid. */
export function parseReelLineupMilestoneDataOrNull(raw: unknown): ReelLineupMilestoneData | null {
  if (raw == null || typeof raw !== 'object') {
    return null
  }
  const parsed = reelLineupMilestoneDataSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function isEmptyReelLineupData(data: unknown): data is ReelLineupMilestoneData {
  return (
    data != null &&
    typeof data === 'object' &&
    'reels' in data &&
    Array.isArray((data as ReelLineupMilestoneData).reels) &&
    (data as ReelLineupMilestoneData).reels.length === 0
  )
}

export function hasReelLineupReels(data: unknown): data is ReelLineupMilestoneData {
  return (
    data != null &&
    typeof data === 'object' &&
    'reels' in data &&
    Array.isArray((data as ReelLineupMilestoneData).reels) &&
    (data as ReelLineupMilestoneData).reels.length > 0
  )
}

type ReelCopyPlan = {
  groupId: string
  title: string
  description: string
  explanation: string
}

function groupIdFromPlanSlot(
  slot: ReelCopyPlan,
  intent: 'weekday_reel' | 'weekend_reel',
  validGroupIds: Set<string>,
): string {
  const groupId = slot.groupId.trim()
  if (!groupId) {
    throw new Error(`reel_lineup ${intent} must include groupId from Menu clusterer groups`)
  }
  if (!validGroupIds.has(groupId)) {
    throw new Error(`reel_lineup ${intent} references unknown group id ${groupId}`)
  }
  return groupId
}

type WeeklyReelPlan = {
  weekIndex: number
  weekdayReel: ReelCopyPlan
  weekendReel: ReelCopyPlan
}

function heroDishesFromGroup(group: MenuClustererGroup) {
  return group.items
    .filter((item) => item.name.trim())
    .map((item) => ({
      name: item.name,
      ...(item.reelMoment ? { reelMoment: item.reelMoment } : {}),
      ...(item.role === 'star' || item.role === 'puzzle' ? { role: item.role } : {}),
    }))
}

function weeklyPlanByIndex(
  weeklyReels: WeeklyReelPlan[],
  weeks: CampaignWeek[],
): Array<{ week: CampaignWeek; plan: WeeklyReelPlan }> {
  if (weeklyReels.length !== weeks.length) {
    throw new Error(
      `reel_lineup weeklyReels length (${weeklyReels.length}) must match campaign weeks (${weeks.length})`,
    )
  }

  const byIndex = new Map<number, WeeklyReelPlan>()
  const unmatched: WeeklyReelPlan[] = []
  for (const plan of weeklyReels) {
    if (plan.weekIndex > 0) {
      if (byIndex.has(plan.weekIndex)) {
        throw new Error(`reel_lineup weeklyReels has duplicate weekIndex ${plan.weekIndex}`)
      }
      byIndex.set(plan.weekIndex, plan)
    } else {
      unmatched.push(plan)
    }
  }

  const paired: Array<{ week: CampaignWeek; plan: WeeklyReelPlan }> = []
  for (const week of weeks) {
    const plan = byIndex.get(week.weekIndex) ?? unmatched.shift()
    if (!plan) {
      throw new Error(`reel_lineup weeklyReels missing entry for weekIndex ${week.weekIndex}`)
    }
    paired.push({ week, plan })
  }

  if (unmatched.length > 0) {
    throw new Error('reel_lineup weeklyReels has entries that do not match campaign weeks')
  }

  return paired
}

/** Build Instagram Reel concepts from LLM copy plans (deterministic merge for tests). */
export function buildReelLineupFromPlan(
  weeklyReels: WeeklyReelPlan[],
  groups: MenuClustererGroup[],
  options?: {
    startDate?: string
    endDate?: string
    sourceMenuClustererTitle?: string
    sourceCampaignBriefTitle?: string
    sourceDatesTitle?: string
    notes?: string
  },
): ReelLineupMilestoneData {
  if (groups.length === 0) {
    throw new Error('reel_lineup requires at least one menu clusterer group')
  }

  const startDate = options?.startDate?.trim() ?? ''
  const endDate = options?.endDate?.trim() ?? ''
  if (!startDate || !endDate) {
    throw new Error('reel_lineup requires startDate and endDate')
  }

  const weeks = campaignWeeks(startDate, endDate)
  if (weeks.length === 0) {
    throw new Error('reel_lineup requires at least one campaign week in the dates window')
  }

  const groupsById = new Map(groups.map((group) => [group.id, group]))
  const validGroupIds = new Set(groupsById.keys())

  const reels = weeklyPlanByIndex(weeklyReels, weeks).flatMap(({ week, plan }) => {
    const weekdayGroupId = groupIdFromPlanSlot(plan.weekdayReel, 'weekday_reel', validGroupIds)
    const weekendGroupId = groupIdFromPlanSlot(plan.weekendReel, 'weekend_reel', validGroupIds)
    const weekdayGroup = groupsById.get(weekdayGroupId)
    const weekendGroup = groupsById.get(weekendGroupId)
    if (!weekdayGroup || !weekendGroup) {
      throw new Error('reel_lineup group assignment failed')
    }

    return [
      {
        id: `${REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX}${week.weekStart}`,
        format: 'reel' as const,
        intent: 'weekday_reel' as const,
        title: plan.weekdayReel.title.trim(),
        description: plan.weekdayReel.description.trim(),
        explanation: plan.weekdayReel.explanation.trim(),
        groupIds: [weekdayGroupId],
        weekIndex: week.weekIndex,
        heroDishes: heroDishesFromGroup(weekdayGroup),
      },
      {
        id: `${REEL_LINEUP_WEEKEND_REEL_ID_PREFIX}${week.weekStart}`,
        format: 'reel' as const,
        intent: 'weekend_reel' as const,
        title: plan.weekendReel.title.trim(),
        description: plan.weekendReel.description.trim(),
        explanation: plan.weekendReel.explanation.trim(),
        groupIds: [weekendGroupId],
        weekIndex: week.weekIndex,
        heroDishes: heroDishesFromGroup(weekendGroup),
      },
    ]
  })

  const sourceMenuClustererTitle = options?.sourceMenuClustererTitle?.trim()
  const sourceCampaignBriefTitle = options?.sourceCampaignBriefTitle?.trim()
  const sourceDatesTitle = options?.sourceDatesTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    reels,
    startDate,
    endDate,
    ...(sourceMenuClustererTitle ? { sourceMenuClustererTitle } : {}),
    ...(sourceCampaignBriefTitle ? { sourceCampaignBriefTitle } : {}),
    ...(sourceDatesTitle ? { sourceDatesTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
