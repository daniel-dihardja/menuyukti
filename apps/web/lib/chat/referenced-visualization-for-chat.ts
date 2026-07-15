import { loadMenuHeatmapsForWorkflow } from '@/lib/analytics/load-menu-heatmaps-for-workflow'
import { loadPairLiftMatrixForWorkflow } from '@/lib/analytics/load-pair-lift-matrix-for-workflow'
import { loadSlotDemandProfileForWorkflow } from '@/lib/analytics/load-slot-demand-profile'
import { graphqlQuery } from '@/lib/graphql/client'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'
import type { WorkflowVisualizationId } from '@/lib/workflow/workflow-visualization-ids'

export type ReferencedVisualizationLoadResult =
  | {
      ok: true
      title: string
      visualizationId: WorkflowVisualizationId
      payload: unknown
      usedFallbackRun: boolean
    }
  | { ok: false; status: 400 | 404; message: string }

export const WORKFLOW_VISUALIZATION_CHAT_TITLES: Record<WorkflowVisualizationId, string> = {
  venue_slot_strength_heatmap: 'Venue slot strength',
  menu_item_heatmap: 'Menu item heatmap',
  pair_lift_matrix_heatmap: 'Pair lift matrix',
}

async function validateWorkflowLocation(
  userId: string,
  workflowId: string,
  locationId: number,
): Promise<{ ok: true } | { ok: false; status: 400 | 404; message: string }> {
  const wfRaw = await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId)
  const wfNode = parseNodeData(wfRaw).node
  if (!wfNode || wfNode.nodeType !== 'workflow') {
    return { ok: false, status: 404, message: 'Workflow not found' }
  }
  if (wfNode.locationId == null) {
    return { ok: false, status: 400, message: 'Workflow has no location' }
  }
  if (wfNode.locationId !== locationId) {
    return { ok: false, status: 400, message: 'Location does not match workflow' }
  }
  return { ok: true }
}

/**
 * Load attached visualization analytics for workflow chat @-references.
 */
export async function loadReferencedVisualizationForChat(
  userId: string,
  args: {
    workflowId: string
    locationId: number
    referencedVisualizationId: WorkflowVisualizationId
    analyticsRunId?: number | null
  },
): Promise<ReferencedVisualizationLoadResult> {
  const { workflowId, locationId, referencedVisualizationId, analyticsRunId } = args

  const validated = await validateWorkflowLocation(userId, workflowId, locationId)
  if (!validated.ok) {
    return validated
  }

  const title = WORKFLOW_VISUALIZATION_CHAT_TITLES[referencedVisualizationId]
  const loaderOptions = {
    userId,
    locationId,
    analyticsRunId,
  }

  switch (referencedVisualizationId) {
    case 'venue_slot_strength_heatmap': {
      const result = await loadSlotDemandProfileForWorkflow(loaderOptions)
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
      const result = await loadMenuHeatmapsForWorkflow(loaderOptions)
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
      const result = await loadPairLiftMatrixForWorkflow(loaderOptions)
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
    default: {
      const _exhaustive: never = referencedVisualizationId
      return _exhaustive
    }
  }
}
