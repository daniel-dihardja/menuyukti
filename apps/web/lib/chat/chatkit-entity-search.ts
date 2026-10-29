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

/** @-mention options for advisor ChatKit: attached visualizations only (no media library). */
export async function searchAdvisorChatKitEntities(options: {
  query: string
  attachedVisualizationIds: readonly ChatVisualizationId[]
  visualizationTitles: Record<string, string>
  chartsGroupLabel: string
}): Promise<ChatKitEntity[]> {
  const { query, attachedVisualizationIds, visualizationTitles, chartsGroupLabel } = options

  return attachedVisualizationIds
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
}

/** All known viz ids — used when nothing is attached yet (empty @ charts). */
export const ALL_CHAT_VISUALIZATION_IDS: readonly ChatVisualizationId[] =
  CHAT_VISUALIZATION_ID_VALUES
