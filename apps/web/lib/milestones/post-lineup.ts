import type { MenuTaggerItem, PostLineupMilestoneData } from '@/lib/graphql/node-schemas'

export const POST_LINEUP_PINNED_POST_ID = 'pinned-monthly-menu'
export const POST_LINEUP_MAX_SLIDES = 5

export const EMPTY_POST_LINEUP_DATA: PostLineupMilestoneData = {
  posts: [],
}

function joinTagValues(values: string[] | undefined, fallback: string): string {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned.join(', ') : fallback
}

function buildImageBrief(item: MenuTaggerItem): string {
  const name = item.name.trim()
  const tags = item.tags
  const texture = joinTagValues(tags.texture, 'appetizing')
  const prepStyle = joinTagValues(tags.prep_style, 'chef-prepared')
  const reelMoment = tags.reel_moment.trim() || 'hero'
  const serveTemp = tags.serve_temp.trim() || 'fresh'

  return (
    `High-quality appetizing food photography of ${name}. ` +
    `${texture} texture, ${prepStyle} presentation, served ${serveTemp}. ` +
    `Capture a ${reelMoment} moment with hero framing, natural light, and shallow depth of field.`
  )
}

/** Build Instagram feed post concepts from reel lineup food leads. */
export function buildPostLineup(
  foodLeads: MenuTaggerItem[],
  options?: {
    sourceMenuClustererTitle?: string
    notes?: string
  },
): PostLineupMilestoneData {
  if (foodLeads.length === 0) {
    throw new Error('post_lineup requires at least one food lead from prior menu_clusterer data')
  }

  const slides = foodLeads.slice(0, POST_LINEUP_MAX_SLIDES).map((item) => ({
    dishName: item.name,
    role: item.role,
    category: item.category,
    imageBrief: buildImageBrief(item),
  }))

  const sourceMenuClustererTitle = options?.sourceMenuClustererTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    posts: [
      {
        id: POST_LINEUP_PINNED_POST_ID,
        format: 'carousel',
        intent: 'pinned_monthly_menu',
        title: 'Monthly top menu',
        slides,
      },
    ],
    ...(sourceMenuClustererTitle ? { sourceMenuClustererTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
