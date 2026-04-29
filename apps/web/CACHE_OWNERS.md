# Cache Owners Map (`apps/web`)

This maps cached read functions to the mutation routes that must invalidate them.

## GraphQL cached reads

| Cached read                                                          | Cache tag owner                                                   | Invalidation route owners                                                                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCachedLocationsData(userId)`                                     | `graphqlLocationsDataCacheTag(userId)`                            | `app/api/locations/route.ts`, `app/api/locations/[id]/route.ts`                                                                                     |
| `getCachedLocation(userId, locationId)`                              | `graphqlLocationsDataCacheTag(userId)`                            | `app/api/locations/route.ts`, `app/api/locations/[id]/route.ts`                                                                                     |
| `getCachedWorkflowsByLocation(userId, locationId)`                   | `graphqlWorkflowsByLocationCacheTag(userId, locationId)`          | `app/api/workflows/create/route.ts` (via `revalidateLocationScopedLists`)                                                                           |
| `getCachedAnalyticsRunsByLocation(userId, locationId)`               | `graphqlAnalyticsRunsByLocationCacheTag(userId, locationId)`      | `app/api/analytics/create/route.ts`, `app/api/analytics/delete/route.ts`, `app/api/workflows/create/route.ts` (via `revalidateLocationScopedLists`) |
| `getCachedWorkflowCampaignTree(userId, workflowId)`                  | `graphqlWorkflowCampaignTreeCacheTag(userId, workflowId)`         | workflow mutation routes through `revalidateWorkflowCampaignTreeCache`                                                                              |
| `getCachedAnalyticsRun(userId, analyticsRunId)`                      | `graphqlAnalyticsRunCacheTag(userId, analyticsRunId)`             | none currently (TTL based)                                                                                                                          |
| `getCachedMenuEngineeringMatrix(userId, analyticsRunId, locationId)` | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                                                       |
| `getCachedMenuHeatmaps(userId, analyticsRunId, locationId)`          | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                                                       |
| `getCachedPromotionMenuItems(userId, analyticsRunId, locationId)`    | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                                                       |
| `getCachedImageAiFlows(userId)`                                      | `graphqlImageAiFlowsCacheTag(userId)`                             | `app/api/image-ai-flows/route.ts`, `app/api/image-ai-flows/[slug]/route.ts`                                                                         |

## Notes

- `revalidateLocationScopedLists(userId, locationId)` is the shared invalidation helper for location-scoped analytics/workflow list reads.
- Default cache lifetime for the GraphQL cached reads above is currently `cacheLife({ revalidate: 60 })`.
