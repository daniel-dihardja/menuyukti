import { redirect } from 'next/navigation'

import { routes } from '@/lib/routes'

/** Legacy `/analytics/sales` → Locations area reports. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>
}) {
  const { locationId } = await searchParams
  if (locationId) {
    redirect(routes.analytics.salesWithLocation(locationId))
  }
  redirect(routes.analytics.sales)
}
