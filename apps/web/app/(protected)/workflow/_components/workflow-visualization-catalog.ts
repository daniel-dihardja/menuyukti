export type WorkflowVisualizationId = 'venue_slot_strength_heatmap' | 'menu_item_heatmap'

export type WorkflowVisualizationCatalogEntry = {
  id: WorkflowVisualizationId
}

export const WORKFLOW_VISUALIZATION_CATALOG: WorkflowVisualizationCatalogEntry[] = [
  { id: 'venue_slot_strength_heatmap' },
  { id: 'menu_item_heatmap' },
]

export const WORKFLOW_VISUALIZATION_IDS: WorkflowVisualizationId[] =
  WORKFLOW_VISUALIZATION_CATALOG.map((entry) => entry.id)

export function isWorkflowVisualizationId(value: string): value is WorkflowVisualizationId {
  return WORKFLOW_VISUALIZATION_IDS.includes(value as WorkflowVisualizationId)
}

export function addVisualizationId(
  addedIds: WorkflowVisualizationId[],
  id: WorkflowVisualizationId,
): WorkflowVisualizationId[] {
  if (addedIds.includes(id)) return addedIds
  return [...addedIds, id]
}

export function removeVisualizationId(
  addedIds: WorkflowVisualizationId[],
  id: WorkflowVisualizationId,
): WorkflowVisualizationId[] {
  return addedIds.filter((existing) => existing !== id)
}

export function parseStoredVisualizationIds(value: string | null): WorkflowVisualizationId[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is WorkflowVisualizationId =>
      isWorkflowVisualizationId(String(id)),
    )
  } catch {
    return []
  }
}

export function getAvailableCatalogEntries(
  addedIds: WorkflowVisualizationId[],
): WorkflowVisualizationCatalogEntry[] {
  const added = new Set(addedIds)
  return WORKFLOW_VISUALIZATION_CATALOG.filter((entry) => !added.has(entry.id))
}
