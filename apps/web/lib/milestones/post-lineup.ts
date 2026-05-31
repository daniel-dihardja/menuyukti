import type {
  MenuClustererGroup,
  MenuTaggerItem,
  PostLineupMilestoneData,
} from '@/lib/graphql/node-schemas'

export const POST_LINEUP_PINNED_POST_ID = 'pinned-monthly-menu'
export const POST_LINEUP_WEEKLY_POST_ID = 'weekday-lunch-post'
export const POST_LINEUP_MAX_SLIDES = 5

export const EMPTY_POST_LINEUP_DATA: PostLineupMilestoneData = {
  posts: [],
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

type PostLineupPlanPost = {
  intent: 'pinned_monthly_menu' | 'weekday_lunch_post'
  title: string
  groupIds: string[]
}

/** Build Instagram feed post concepts from LLM group plans (deterministic merge for tests). */
export function buildPostLineupFromPlan(
  monthlyPost: PostLineupPlanPost,
  weeklyPost: PostLineupPlanPost,
  groups: MenuClustererGroup[],
  foodLeads: MenuTaggerItem[],
  options?: {
    sourceMenuClustererTitle?: string
    sourceCampaignBriefTitle?: string
    notes?: string
  },
): PostLineupMilestoneData {
  if (groups.length === 0) {
    throw new Error('post_lineup requires at least one menu clusterer group')
  }

  const groupsById = new Map(groups.map((group) => [group.id, group]))
  const foodLeadsByName = new Map(foodLeads.map((item) => [nameKey(item.name), item]))

  const buildPost = (plan: PostLineupPlanPost) => {
    const selectedGroups = plan.groupIds.map((groupId) => {
      const group = groupsById.get(groupId)
      if (!group) {
        throw new Error(`post_lineup plan references unknown group id ${groupId}`)
      }
      return group
    })

    const seen = new Set<string>()
    const slides = selectedGroups
      .flatMap((group) => group.items)
      .filter((item) => {
        const key = nameKey(item.name)
        if (seen.has(key)) {
          return false
        }
        seen.add(key)
        return true
      })
      .slice(0, POST_LINEUP_MAX_SLIDES)
      .map((item) => {
        const lookup = foodLeadsByName.get(nameKey(item.name))
        return {
          dishName: item.name,
          role: item.role,
          category: item.category,
          imageBrief: buildImageBrief(lookup ?? item),
        }
      })

    if (slides.length === 0) {
      throw new Error(`post_lineup plan for ${plan.intent} produced no slides`)
    }

    return {
      id:
        plan.intent === 'pinned_monthly_menu'
          ? POST_LINEUP_PINNED_POST_ID
          : POST_LINEUP_WEEKLY_POST_ID,
      format: 'carousel' as const,
      intent: plan.intent,
      title: plan.title,
      slides,
      groupIds: plan.groupIds,
      ...(plan.intent === 'weekday_lunch_post'
        ? {
            scheduleHints: {
              preferredWeekdays: ['tuesday' as const],
              preferredTime: '10:00',
            },
          }
        : {}),
    }
  }

  const sourceMenuClustererTitle = options?.sourceMenuClustererTitle?.trim()
  const sourceCampaignBriefTitle = options?.sourceCampaignBriefTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    posts: [buildPost(monthlyPost), buildPost(weeklyPost)],
    ...(sourceMenuClustererTitle ? { sourceMenuClustererTitle } : {}),
    ...(sourceCampaignBriefTitle ? { sourceCampaignBriefTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
