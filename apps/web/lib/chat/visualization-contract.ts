/**
 * Canonical chat visualization contract (IDs + LLM/chat constants).
 *
 * Agents mirror these in `apps/agents/agents/core/chat/chart_data.py` — keep in sync
 * (see agents `test_chat_chart_catalog_parity.py`).
 */
import {
  CHAT_VISUALIZATION_ID_VALUES,
  isChatVisualizationId,
  type ChatVisualizationId,
} from '@/lib/chat/visualization-ids'

export { CHAT_VISUALIZATION_ID_VALUES, isChatVisualizationId, type ChatVisualizationId }

/** Max menu items included in chat summaries (raw hourly arrays are omitted). */
export const MENU_HEATMAP_CHAT_TOP_N = 25

/** When matrix data exists, chat heatmaps keep only these BCG roles (excludes low_end). */
export const HEATMAP_MATRIX_CHAT_CATEGORIES: ReadonlySet<string> = new Set([
  'star',
  'plow_horse',
  'puzzle',
])

/** English titles for LLM / @-mention markdown (UI copy lives in next-intl). */
export const CHAT_VISUALIZATION_TITLES: Record<ChatVisualizationId, string> = {
  venue_slot_strength_heatmap: 'Venue slot strength',
  menu_item_heatmap: 'Menu item heatmap',
  pair_lift_matrix_heatmap: 'Pair lift matrix',
  low_end_review: 'Low End review',
}
