export const WORKFLOW_VISUALIZATION_ID_VALUES = [
  'venue_slot_strength_heatmap',
  'menu_item_heatmap',
  'pair_lift_matrix_heatmap',
] as const

export type WorkflowVisualizationId = (typeof WORKFLOW_VISUALIZATION_ID_VALUES)[number]

export function isWorkflowVisualizationId(value: string): value is WorkflowVisualizationId {
  return (WORKFLOW_VISUALIZATION_ID_VALUES as readonly string[]).includes(value)
}
