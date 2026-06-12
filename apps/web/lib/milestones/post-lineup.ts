import type {
  MenuClustererGroup,
  MenuTaggerItem,
  PostLineupMilestoneData,
} from '@/lib/graphql/node-schemas'
import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'

import { type CampaignWeek, campaignWeeks } from '@/lib/milestones/dates-window'
import { sortByPopularityDesc } from '@/lib/milestones/popularity-display'

export const POST_LINEUP_PINNED_POST_ID = 'pinned-monthly-menu'
export const POST_LINEUP_WEEKLY_POST_ID_PREFIX = 'weekday-lunch-post-week'
export const POST_LINEUP_MAX_SLIDES = 5

export const EMPTY_POST_LINEUP_DATA: PostLineupMilestoneData = {
  posts: [],
}

/** Parse persisted/API post lineup payload; returns null when missing or invalid (never empty fallback). */
export function parsePostLineupMilestoneDataOrNull(raw: unknown): PostLineupMilestoneData | null {
  if (raw == null || typeof raw !== 'object') {
    return null
  }
  const parsed = postLineupMilestoneDataSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function isEmptyPostLineupData(data: unknown): data is PostLineupMilestoneData {
  return (
    data != null &&
    typeof data === 'object' &&
    'posts' in data &&
    Array.isArray((data as PostLineupMilestoneData).posts) &&
    (data as PostLineupMilestoneData).posts.length === 0
  )
}

export function hasPostLineupPosts(data: unknown): data is PostLineupMilestoneData {
  return (
    data != null &&
    typeof data === 'object' &&
    'posts' in data &&
    Array.isArray((data as PostLineupMilestoneData).posts) &&
    (data as PostLineupMilestoneData).posts.length > 0
  )
}

function joinTagValues(values: string[] | undefined, fallback: string): string {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned.join(', ') : fallback
}

function buildImageBrief(item: MenuTaggerItem | MenuClustererGroup['items'][number]): string {
  const name = item.name.trim()
  const tags = 'tags' in item ? item.tags : undefined
  const texture = joinTagValues(tags?.texture, 'appetizing')
  const prepStyle = joinTagValues(tags?.prep_style, 'chef-prepared')
  const reelMoment =
    (tags?.reel_moment ?? ('reelMoment' in item ? item.reelMoment : undefined))?.trim() || 'hero'
  const serveTemp = tags?.serve_temp?.trim() || 'fresh'

  return (
    `High-quality appetizing food photography of ${name}. ` +
    `${texture} texture, ${prepStyle} presentation, served ${serveTemp}. ` +
    `Capture a ${reelMoment} moment with hero framing, natural light, and shallow depth of field.`
  )
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

function slideMetricsFromItem(
  item: MenuClustererGroup['items'][number],
  lookup?: MenuTaggerItem,
): { storytellingFit?: 'strong' | 'weak'; popularity?: number } {
  const storytellingFit = item.storytellingFit ?? lookup?.storytellingFit
  const popularity = item.popularity ?? lookup?.popularity

  return {
    ...(storytellingFit === 'strong' || storytellingFit === 'weak' ? { storytellingFit } : {}),
    ...(typeof popularity === 'number' ? { popularity } : {}),
  }
}

type PostLineupPlanPost = {
  intent: 'pinned_monthly_menu' | 'weekday_lunch_post'
  title: string
  groupIds: string[]
  description?: string
  captionGuidance?: string
  weekIndex?: number
}

function weeklyPlanByIndex(
  weeklyPosts: PostLineupPlanPost[],
  weeks: CampaignWeek[],
): Array<{ week: CampaignWeek; plan: PostLineupPlanPost }> {
  if (weeklyPosts.length !== weeks.length) {
    throw new Error(
      `post_lineup weeklyPosts length (${weeklyPosts.length}) must match campaign weeks (${weeks.length})`,
    )
  }

  const byIndex = new Map<number, PostLineupPlanPost>()
  const unmatched: PostLineupPlanPost[] = []
  for (const plan of weeklyPosts) {
    if (typeof plan.weekIndex === 'number' && plan.weekIndex > 0) {
      if (byIndex.has(plan.weekIndex)) {
        throw new Error(`post_lineup weeklyPosts has duplicate weekIndex ${plan.weekIndex}`)
      }
      byIndex.set(plan.weekIndex, plan)
    } else {
      unmatched.push(plan)
    }
  }

  const paired: Array<{ week: CampaignWeek; plan: PostLineupPlanPost }> = []
  for (const week of weeks) {
    const plan = byIndex.get(week.weekIndex) ?? unmatched.shift()
    if (!plan) {
      throw new Error(`post_lineup weeklyPosts missing entry for weekIndex ${week.weekIndex}`)
    }
    if (plan.intent !== 'weekday_lunch_post') {
      throw new Error(`weeklyPosts entry for week ${week.weekIndex} must be weekday_lunch_post`)
    }
    paired.push({ week, plan })
  }

  if (unmatched.length > 0) {
    throw new Error('post_lineup weeklyPosts has entries that do not match campaign weeks')
  }

  return paired
}

/** Build Instagram feed post concepts from LLM group plans (deterministic merge for tests). */
export function buildPostLineupFromPlan(
  monthlyPost: PostLineupPlanPost,
  weeklyPosts: PostLineupPlanPost[],
  groups: MenuClustererGroup[],
  foodLeads: MenuTaggerItem[],
  options?: {
    startDate?: string
    endDate?: string
    campaignBriefData?: { overallStrategy?: { strategyFocus?: string } }
    sourceMenuClustererTitle?: string
    sourceCampaignBriefTitle?: string
    sourceDatesTitle?: string
    notes?: string
  },
): PostLineupMilestoneData {
  if (groups.length === 0) {
    throw new Error('post_lineup requires at least one menu clusterer group')
  }

  const startDate = options?.startDate?.trim() ?? ''
  const endDate = options?.endDate?.trim() ?? ''
  if (!startDate || !endDate) {
    throw new Error('post_lineup requires startDate and endDate')
  }

  const weeks = campaignWeeks(startDate, endDate)
  if (weeks.length === 0) {
    throw new Error('post_lineup requires at least one campaign week in the dates window')
  }

  const groupsById = new Map(groups.map((group) => [group.id, group]))
  const foodLeadsByName = new Map(foodLeads.map((item) => [nameKey(item.name), item]))

  const buildPost = (plan: PostLineupPlanPost, postId: string) => {
    const selectedGroups = plan.groupIds.map((groupId) => {
      const group = groupsById.get(groupId)
      if (!group) {
        throw new Error(`post_lineup plan references unknown group id ${groupId}`)
      }
      return group
    })

    const seen = new Set<string>()
    const slides = sortByPopularityDesc(
      selectedGroups
        .flatMap((group) => group.items)
        .filter((item) => {
          const key = nameKey(item.name)
          if (seen.has(key)) {
            return false
          }
          seen.add(key)
          return true
        })
        .map((item) => {
          const lookup = foodLeadsByName.get(nameKey(item.name))
          return {
            dishName: item.name,
            role: item.role,
            category: item.category,
            imageBrief: buildImageBrief(lookup ?? item),
            ...slideMetricsFromItem(item, lookup),
          }
        }),
    ).slice(0, plan.intent === 'pinned_monthly_menu' ? undefined : POST_LINEUP_MAX_SLIDES)

    if (slides.length === 0) {
      throw new Error(`post_lineup plan for ${plan.intent} produced no slides`)
    }

    const post = {
      id: postId,
      format: 'carousel' as const,
      intent: plan.intent,
      title: plan.title,
      ...(plan.description?.trim() ? { description: plan.description.trim() } : {}),
      ...(plan.captionGuidance?.trim() ? { captionGuidance: plan.captionGuidance.trim() } : {}),
      slides,
      groupIds: plan.groupIds,
    }

    return post
  }

  if (monthlyPost.intent !== 'pinned_monthly_menu') {
    throw new Error('monthlyPost intent must be pinned_monthly_menu')
  }

  const posts = [
    buildPost(monthlyPost, POST_LINEUP_PINNED_POST_ID),
    ...weeklyPlanByIndex(weeklyPosts, weeks).map(({ week, plan }) =>
      buildPost(plan, `${POST_LINEUP_WEEKLY_POST_ID_PREFIX}-${week.weekStart}`),
    ),
  ]

  const sourceMenuClustererTitle = options?.sourceMenuClustererTitle?.trim()
  const sourceCampaignBriefTitle = options?.sourceCampaignBriefTitle?.trim()
  const sourceDatesTitle = options?.sourceDatesTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    posts,
    startDate,
    endDate,
    ...(sourceMenuClustererTitle ? { sourceMenuClustererTitle } : {}),
    ...(sourceCampaignBriefTitle ? { sourceCampaignBriefTitle } : {}),
    ...(sourceDatesTitle ? { sourceDatesTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
