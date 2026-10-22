import { loadLowEndForChat } from '@/lib/analytics/load-low-end-for-chat'
import { loadMenuHeatmapsForChat } from '@/lib/analytics/load-menu-heatmaps-for-chat'
import { loadPairLiftMatrixForChat } from '@/lib/analytics/load-pair-lift-matrix-for-chat'
import { loadSlotDemandProfileForChat } from '@/lib/analytics/load-slot-demand-profile-for-chat'
import {
  CHAT_VISUALIZATION_TITLES,
  type ChatVisualizationId,
} from '@/lib/chat/visualization-contract'

export type ReferencedVisualizationLoadResult =
  | {
      ok: true
      title: string
      visualizationId: ChatVisualizationId
      payload: unknown
      usedFallbackRun: boolean
    }
  | { ok: false; status: 400 | 404; message: string }

export { CHAT_VISUALIZATION_TITLES }

/**
 * Load attached visualization analytics for chat @-references (location-scoped).
 */
export async function loadReferencedVisualizationForChat(
  userId: string,
  args: {
    locationId: number
    referencedVisualizationId: ChatVisualizationId
    analyticsRunId?: number | null
  },
): Promise<ReferencedVisualizationLoadResult> {
  const { locationId, referencedVisualizationId, analyticsRunId } = args

  if (!Number.isInteger(locationId) || locationId < 1) {
    return { ok: false, status: 400, message: 'Invalid locationId' }
  }

  const title = CHAT_VISUALIZATION_TITLES[referencedVisualizationId]
  const loaderOptions = {
    userId,
    locationId,
    analyticsRunId,
  }

  switch (referencedVisualizationId) {
    case 'venue_slot_strength_heatmap': {
      const result = await loadSlotDemandProfileForChat(loaderOptions)
      return {
        ok: true,
        title,
        visualizationId: referencedVisualizationId,
        payload: {
          slotDemandProfile: result.slotDemandProfile,
          analyticsRunId: result.analyticsRunId,
        },
        usedFallbackRun: result.usedFallbackRun,
      }
    }
    case 'menu_item_heatmap': {
      const result = await loadMenuHeatmapsForChat(loaderOptions)
      return {
        ok: true,
        title,
        visualizationId: referencedVisualizationId,
        payload: {
          menuHeatmaps: result.menuHeatmaps,
          matrixItems: result.matrixItems,
          dailyStartHour: result.dailyStartHour,
          dailyEndHour: result.dailyEndHour,
          analyticsRunId: result.analyticsRunId,
        },
        usedFallbackRun: result.usedFallbackRun,
      }
    }
    case 'pair_lift_matrix_heatmap': {
      const result = await loadPairLiftMatrixForChat(loaderOptions)
      return {
        ok: true,
        title,
        visualizationId: referencedVisualizationId,
        payload: {
          focusMenus: result.focusMenus,
          matrixLift: result.matrixLift,
          totalOrders: result.totalOrders,
          multiItemOrderCount: result.multiItemOrderCount,
          scope: result.scope,
          analyticsRunId: result.analyticsRunId,
        },
        usedFallbackRun: result.usedFallbackRun,
      }
    }
    case 'low_end_review': {
      const result = await loadLowEndForChat(loaderOptions)
      return {
        ok: true,
        title,
        visualizationId: referencedVisualizationId,
        payload: {
          items: result.items,
          distribution: result.distribution,
          periodStart: result.periodStart,
          periodEnd: result.periodEnd,
          analyticsRunId: result.analyticsRunId,
        },
        usedFallbackRun: result.usedFallbackRun,
      }
    }
    default: {
      const _exhaustive: never = referencedVisualizationId
      return _exhaustive
    }
  }
}
