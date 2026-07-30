export const CHAT_VISUALIZATION_ID_VALUES = [
  'venue_slot_strength_heatmap',
  'menu_item_heatmap',
  'pair_lift_matrix_heatmap',
] as const

export type ChatVisualizationId = (typeof CHAT_VISUALIZATION_ID_VALUES)[number]

export function isChatVisualizationId(value: string): value is ChatVisualizationId {
  return (CHAT_VISUALIZATION_ID_VALUES as readonly string[]).includes(value)
}
