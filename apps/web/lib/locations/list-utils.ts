type OpeningHour = {
  dayOfWeek: string
  openTime: string
  closeTime: string
}

export type LocationListItem = {
  id: string
  name: string
  nodeId: string | null
  city: string | null
  country: string | null
  currency: string | null
  openingHours: OpeningHour[]
}

export type LocationSetupStatus = 'incomplete' | 'ready_for_sales' | 'analytics_active'

export function locationHasOpeningHours(openingHours: OpeningHour[]): boolean {
  return openingHours.some((entry) => entry.openTime.trim() && entry.closeTime.trim())
}

export function locationBasicsComplete(location: LocationListItem): boolean {
  return Boolean(location.country?.trim() && location.currency?.trim())
}

export function getLocationSetupStatus(
  location: LocationListItem,
  analyticsRunCount: number,
): LocationSetupStatus {
  if (!locationBasicsComplete(location) || !locationHasOpeningHours(location.openingHours)) {
    return 'incomplete'
  }
  if (analyticsRunCount > 0) {
    return 'analytics_active'
  }
  return 'ready_for_sales'
}

export function formatLocationSubtitle(location: LocationListItem): string | null {
  const parts = [location.city?.trim(), location.country?.trim()].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join(', ')
}
