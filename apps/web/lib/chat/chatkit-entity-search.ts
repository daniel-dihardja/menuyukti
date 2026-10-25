import { loadMedia, type MediaCatalogItem } from '@/lib/media/client-api'
import {
  CHAT_VISUALIZATION_ID_VALUES,
  type ChatVisualizationId,
} from '@/lib/chat/visualization-ids'

export type ChatKitEntity = {
  id: string
  title: string
  group?: string
  icon?: string
  interactive?: boolean
  data?: Record<string, string>
}

function matchesQuery(haystack: string, query: string): boolean {
  if (!query.trim()) return true
  return haystack.toLowerCase().includes(query.trim().toLowerCase())
}

export async function searchAdvisorChatKitEntities(options: {
  query: string
  attachedVisualizationIds: readonly ChatVisualizationId[]
  visualizationTitles: Record<string, string>
  mediaGroupLabel: string
  chartsGroupLabel: string
}): Promise<ChatKitEntity[]> {
  const {
    query,
    attachedVisualizationIds,
    visualizationTitles,
    mediaGroupLabel,
    chartsGroupLabel,
  } = options

  const chartEntities: ChatKitEntity[] = attachedVisualizationIds
    .filter((id) => {
      const title = visualizationTitles[id] ?? id
      return matchesQuery(`${id} ${title}`, query)
    })
    .map((id) => ({
      id: `viz:${id}`,
      title: visualizationTitles[id] ?? id,
      group: chartsGroupLabel,
      icon: 'chart',
      interactive: true,
      data: { kind: 'visualization', visualizationId: id },
    }))

  let mediaItems: MediaCatalogItem[] = []
  try {
    mediaItems = await loadMedia()
  } catch {
    mediaItems = []
  }

  const mediaEntities: ChatKitEntity[] = mediaItems
    .filter((item) => matchesQuery(`${item.name} ${item.displayName ?? ''}`, query))
    .slice(0, 40)
    .map((item) => ({
      id: `media:${item.name}`,
      title: item.displayName?.trim() || item.name,
      group: mediaGroupLabel,
      icon: 'images',
      interactive: true,
      data: { kind: 'media', name: item.name },
    }))

  return [...chartEntities, ...mediaEntities]
}

/** All known viz ids — used when nothing is attached yet (empty @ charts). */
export const ALL_CHAT_VISUALIZATION_IDS: readonly ChatVisualizationId[] =
  CHAT_VISUALIZATION_ID_VALUES
