# Cache Owners Map (`apps/web`)

This maps cached read functions to the mutation routes that must invalidate them.

## GraphQL cached reads

| Cached read                                                          | Cache tag owner                                                   | Invalidation route owners                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `getCachedLocationsData(userId)`                                     | `graphqlLocationsDataCacheTag(userId)`                            | `app/api/locations/route.ts`, `app/api/locations/[id]/route.ts`                                                |
| `getCachedLocation(userId, locationId)`                              | `graphqlLocationsDataCacheTag(userId)`                            | `app/api/locations/route.ts`, `app/api/locations/[id]/route.ts`                                                |
| `getCachedAnalyticsRunsByLocation(userId, locationId)`               | `graphqlAnalyticsRunsByLocationCacheTag(userId, locationId)`      | `app/api/analytics/create/route.ts`, `app/api/analytics/delete/route.ts` (via `revalidateLocationScopedLists`) |
| `getCachedAnalyticsRun(userId, analyticsRunId)`                      | `graphqlAnalyticsRunCacheTag(userId, analyticsRunId)`             | none currently (TTL based)                                                                                     |
| `getCachedMenuEngineeringMatrix(userId, analyticsRunId, locationId)` | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                  |
| `getCachedMenuHeatmaps(userId, analyticsRunId, locationId)`          | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                  |
| `getCachedMenuCombos(userId, analyticsRunId, locationId)`            | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                  |
| `getCachedPromotionMenuItems(userId, analyticsRunId, locationId)`    | `graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)` | `app/api/analytics/[analyticsId]/cogs/route.ts` via `revalidateAnalyticsRunComputationsCache`                  |

## Notes

- `revalidateLocationScopedLists(userId, locationId)` is the shared invalidation helper for location-scoped analytics list reads.
- Default cache lifetime for the GraphQL cached reads above is currently `cacheLife({ revalidate: 60 })`.
- **Cache tuning (future):** if list staleness becomes noticeable after mutations, prefer tag invalidation (already wired) over lowering TTL globally; only shorten `cacheLife` on high-churn entities if needed.
- **Server Actions:** mutations remain on BFF route handlers (`app/api/**`) for streaming uploads, REST-style client fetches, and consistent cache tag invalidation. Selective Server Actions can be added later for form progressive enhancement where BFF is unnecessary.
