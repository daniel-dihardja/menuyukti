import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'

function parseRequestedLocationId(raw: string | undefined): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

/**
 * Reports hub: send users into Locations → venue → Reports when a location is known.
 * Multi-location workspaces without `locationId` land on the locations list.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const { locationId: locationIdParam } = await searchParams
  const requestedLocationId = parseRequestedLocationId(locationIdParam)
  if (requestedLocationId !== null) {
    redirect(routes.analytics.branchesReports(requestedLocationId))
  }

  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const data = await getCachedLocationsListData(userId)
  const locations = data.locations
  if (locations.length === 1) {
    redirect(routes.analytics.branchesReports(locations[0]!.id))
  }

  redirect(routes.analytics.branches)
}
