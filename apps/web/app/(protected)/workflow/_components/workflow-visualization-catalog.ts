import {
  WORKFLOW_VISUALIZATION_ID_VALUES,
  isWorkflowVisualizationId,
  type WorkflowVisualizationId,
} from '@/lib/workflow/workflow-visualization-ids'

export type { WorkflowVisualizationId }
export { WORKFLOW_VISUALIZATION_ID_VALUES, isWorkflowVisualizationId }

export type WorkflowVisualizationCatalogEntry = {
  id: WorkflowVisualizationId
}

export const WORKFLOW_VISUALIZATION_CATALOG: WorkflowVisualizationCatalogEntry[] =
  WORKFLOW_VISUALIZATION_ID_VALUES.map((id) => ({ id }))

export const WORKFLOW_VISUALIZATION_IDS: WorkflowVisualizationId[] = [
  ...WORKFLOW_VISUALIZATION_ID_VALUES,
]

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
