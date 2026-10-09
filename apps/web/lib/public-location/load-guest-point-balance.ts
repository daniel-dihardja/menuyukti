import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_POINT_BALANCES_QUERY,
  type MyPointBalancesData,
} from '@/lib/graphql/queries/point-ledger'
import type { PublicLocationView } from '@/lib/public-location/load-public-location'

/**
 * Venue point balance for the signed-in guest when Point System is on.
 * Returns null when signed out or Point System is unavailable (header pill stays hidden).
 */
export async function loadGuestPointBalance(
  location: PublicLocationView,
  userId: string | null | undefined,
): Promise<number | null> {
  const pointSystemAvailable = Boolean(
    location.services.find((s) => s.key === 'point_system')?.available,
  )
  if (!userId || !pointSystemAvailable) return null

  const data = await graphqlQuery<MyPointBalancesData>(
    MY_POINT_BALANCES_QUERY,
    {},
    userId,
    'MyPointBalances',
  )
  const row = data.myPointBalances.find((b) => b.locationId === location.id)
  return row?.balance ?? 0
}
