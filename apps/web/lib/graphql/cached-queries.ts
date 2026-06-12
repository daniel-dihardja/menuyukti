import { cacheLife, cacheTag } from 'next/cache'

import { graphqlQuery } from '@/lib/graphql/client'
import { DEFAULT_LIST_FIRST } from '@/lib/graphql/pagination'
import {
  graphqlAnalyticsRunsByLocationCacheTag,
  graphqlAnalyticsRunCacheTag,
  graphqlAnalyticsRunComputationsCacheTag,
  graphqlImageAiFlowsCacheTag,
  graphqlLocationsDataCacheTag,
  graphqlWorkflowsByLocationCacheTag,
  graphqlWorkflowCampaignTreeCacheTag,
} from '@/lib/graphql/cache-tags'
import {
  ANALYTICS_RUN_METADATA_QUERY,
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  IMAGE_AI_FLOWS_QUERY,
  LOCATION_QUERY,
  LOCATIONS_QUERY,
  MENU_ENGINEERING_MATRIX_QUERY,
  MENU_HEATMAPS_QUERY,
  NODES_QUERY,
  INSTAGRAM_SIGNALS_QUERY,
  ORDER_METRICS_QUERY,
  PROMOTION_MENU_ITEMS_QUERY,
  WORKFLOW_CAMPAIGN_TREE_QUERY,
  parseNodesData,
  type AnalyticsRunsByLocationData,
  type AnyNode,
  type AnalyticsRunMetadataData,
  type ImageAiFlowsData,
  type LocationsData,
  type MenuEngineeringMatrixData,
  type MenuHeatmapsData,
  type NodesDataRaw,
  type LocationData,
  type InstagramSignalsData,
  type OrderMetricsData,
  type PromotionMenuItemsData,
  type WorkflowCampaignTreeDataRaw,
} from '@/lib/graphql/queries'

/** Cached per user; reduces duplicate GraphQL hits on analytics entry routes. */
export async function getCachedLocationsData(userId: string): Promise<LocationsData> {
  'use cache'
  cacheTag(graphqlLocationsDataCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<LocationsData>(
    LOCATIONS_QUERY,
    { first: DEFAULT_LIST_FIRST },
    userId,
    'Locations',
  )
}

/** Cached per user/location for workflow listings in dashboard and workflows pages. */
export async function getCachedWorkflowsByLocation(
  userId: string,
  locationId: number,
): Promise<AnyNode[]> {
  'use cache'
  cacheTag(graphqlWorkflowsByLocationCacheTag(userId, locationId))
  cacheLife({ revalidate: 60 })
  const raw = await graphqlQuery<NodesDataRaw>(
    NODES_QUERY,
    { locationId, nodeType: 'workflow' },
    userId,
  )
  return parseNodesData(raw).nodes
}

/** Cached per user/location for analytics run selectors in sales and workflows pages. */
export async function getCachedAnalyticsRunsByLocation(
  userId: string,
  locationId: number,
): Promise<Array<{ id: number; name: string }>> {
  'use cache'
  cacheTag(graphqlAnalyticsRunsByLocationCacheTag(userId, locationId))
  cacheLife({ revalidate: 60 })
  const data = await graphqlQuery<AnalyticsRunsByLocationData>(
    ANALYTICS_RUNS_BY_LOCATION_QUERY,
    { locationId, first: 300 },
    userId,
  )
  return (data.analyticsRuns ?? []).map((run) => ({
    id: Number(run.id),
    name: run.name || run.filename || `Run #${run.id}`,
  }))
}

/** Cached per user and analytics run; metadata only (no `menuItemCogs`) for matrix/heatmap shells. */
export async function getCachedAnalyticsRun(
  userId: string,
  analyticsRunId: string,
): Promise<AnalyticsRunMetadataData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<AnalyticsRunMetadataData>(
    ANALYTICS_RUN_METADATA_QUERY,
    { id: analyticsRunId },
    userId,
    'AnalyticsRunMetadata',
  )
}

/** Cached single location details for location settings and route helpers. */
export async function getCachedLocation(userId: string, locationId: string): Promise<LocationData> {
  'use cache'
  cacheTag(graphqlLocationsDataCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<LocationData>(LOCATION_QUERY, { id: locationId }, userId, 'Location')
}

/** Cached per user; Studio list of image AI flows. */
export async function getCachedImageAiFlows(userId: string): Promise<ImageAiFlowsData> {
  'use cache'
  cacheTag(graphqlImageAiFlowsCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<ImageAiFlowsData>(
    IMAGE_AI_FLOWS_QUERY,
    { includeInactive: true },
    userId,
    'ImageAiFlows',
  )
}

/**
 * Menu engineering matrix for a run. Tagged with `graphqlAnalyticsRunComputationsCacheTag`
 * (shared with heatmaps). Invalidate from API routes when COGS or order facts change.
 */
export async function getCachedMenuEngineeringMatrix(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<MenuEngineeringMatrixData> {
  'use cache'
  const computationsTag = graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)
  cacheTag(computationsTag)
  cacheLife({ revalidate: 60 })
  return graphqlQuery<MenuEngineeringMatrixData>(
    MENU_ENGINEERING_MATRIX_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'MenuEngineeringMatrix',
  )
}

/**
 * Menu heatmaps for a run. Same computation cache tag as matrix so one invalidation clears both.
 */
export async function getCachedMenuHeatmaps(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<MenuHeatmapsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<MenuHeatmapsData>(
    MENU_HEATMAPS_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'MenuHeatmaps',
  )
}

/** Campaign brief operating signals composed from analytics pipelines for a run. */
export async function getCachedInstagramSignals(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<InstagramSignalsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<InstagramSignalsData>(
    INSTAGRAM_SIGNALS_QUERY,
    { analyticsRunId, locationId },
    userId,
    'InstagramSignals',
  )
}

/** Average order size and revenue for an analytics run. */
export async function getCachedOrderMetrics(
  userId: string,
  analyticsRunId: string,
): Promise<OrderMetricsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<OrderMetricsData>(
    ORDER_METRICS_QUERY,
    { analyticsRunId },
    userId,
    'OrderMetrics',
  )
}

/** Promotion menu items derived from order facts for an analytics run. */
export async function getCachedPromotionMenuItems(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<PromotionMenuItemsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<PromotionMenuItemsData>(
    PROMOTION_MENU_ITEMS_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'PromotionMenuItems',
  )
}

/**
 * Full workflow campaign tree for the workflow detail page. Invalidate via
 * `revalidateWorkflowCampaignTreeCache` after milestone/workflow BFF mutations.
 */
export async function getCachedWorkflowCampaignTree(
  userId: string,
  workflowId: string,
): Promise<WorkflowCampaignTreeDataRaw> {
  'use cache'
  cacheTag(graphqlWorkflowCampaignTreeCacheTag(userId, workflowId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<WorkflowCampaignTreeDataRaw>(
    WORKFLOW_CAMPAIGN_TREE_QUERY,
    { workflowId },
    userId,
    'WorkflowCampaignTree',
  )
}
