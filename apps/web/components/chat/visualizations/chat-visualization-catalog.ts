import {
  CHAT_VISUALIZATION_ID_VALUES,
  isChatVisualizationId,
  type ChatVisualizationId,
} from '@/lib/chat/visualization-ids'

export type { ChatVisualizationId }
export { CHAT_VISUALIZATION_ID_VALUES, isChatVisualizationId }

export type ChatVisualizationCatalogEntry = {
  id: ChatVisualizationId
}

export const CHAT_VISUALIZATION_CATALOG: ChatVisualizationCatalogEntry[] =
  CHAT_VISUALIZATION_ID_VALUES.map((id) => ({ id }))

export const CHAT_VISUALIZATION_IDS: ChatVisualizationId[] = [...CHAT_VISUALIZATION_ID_VALUES]

export function addVisualizationId(
  addedIds: ChatVisualizationId[],
  id: ChatVisualizationId,
): ChatVisualizationId[] {
  if (addedIds.includes(id)) return addedIds
  return [...addedIds, id]
}

export function removeVisualizationId(
  addedIds: ChatVisualizationId[],
  id: ChatVisualizationId,
): ChatVisualizationId[] {
  return addedIds.filter((existing) => existing !== id)
}

export function parseStoredVisualizationIds(value: string | null): ChatVisualizationId[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is ChatVisualizationId => isChatVisualizationId(String(id)))
  } catch {
    return []
  }
}

export function getAvailableCatalogEntries(
  addedIds: ChatVisualizationId[],
): ChatVisualizationCatalogEntry[] {
  const added = new Set(addedIds)
  return CHAT_VISUALIZATION_CATALOG.filter((entry) => !added.has(entry.id))
}
