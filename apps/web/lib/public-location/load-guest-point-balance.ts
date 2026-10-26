import { isServiceKeyFeatureEnabled } from '@/lib/feature-flags'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_POINT_BALANCES_QUERY,
  type MyPointBalancesData,
} from '@/lib/graphql/queries/point-ledger'
import { SERVICE_KEY_POINT_SYSTEM } from '@/lib/graphql/queries/service-subscriptions'
import type { PublicLocationView } from '@/lib/public-location/load-public-location'

/**
 * Whether Point System should surface on guest public pages for this venue.
 * Requires the release flag and an active location subscription.
 */
export function isPublicPointSystemAvailable(location: PublicLocationView): boolean {
  if (!isServiceKeyFeatureEnabled(SERVICE_KEY_POINT_SYSTEM)) return false
  return Boolean(location.services.find((s) => s.key === SERVICE_KEY_POINT_SYSTEM)?.available)
}

/**
 * Venue point balance for the signed-in guest when Point System is on.
 * Returns null when signed out or Point System is unavailable (header pill stays hidden).
 */
export async function loadGuestPointBalance(
  location: PublicLocationView,
  userId: string | null | undefined,
): Promise<number | null> {
  if (!userId || !isPublicPointSystemAvailable(location)) return null

  const data = await graphqlQuery<MyPointBalancesData>(
    MY_POINT_BALANCES_QUERY,
    {},
    userId,
    'MyPointBalances',
  )
  const row = data.myPointBalances.find((b) => b.locationId === location.id)
  return row?.balance ?? 0
}
