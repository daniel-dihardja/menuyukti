import { isFeatureEnabled } from '@/lib/feature-flags'

export const PLAYBOOK_CATALOG = [
  {
    id: 'publicHolidays',
    slug: 'public-holidays',
    playbookType: 'public_holidays',
    supportsCreate: true,
  },
  {
    id: 'nearbyLocations',
    slug: 'nearby-locations',
    playbookType: 'nearby_locations',
    supportsCreate: true,
    /** When set, catalog + routes honor this feature flag id. */
    featureId: 'playbookNearbyLocations',
  },
] as const

export type PlaybookCatalogEntry = (typeof PLAYBOOK_CATALOG)[number]
export type PlaybookId = PlaybookCatalogEntry['id']
export type PlaybookSlug = PlaybookCatalogEntry['slug']
export type PlaybookTypeSlug = PlaybookCatalogEntry['playbookType']

export function getPlaybookBySlug(slug: string): PlaybookCatalogEntry | null {
  return PLAYBOOK_CATALOG.find((entry) => entry.slug === slug) ?? null
}

export function playbookTypeFromSlug(slug: string): PlaybookTypeSlug | null {
  return getPlaybookBySlug(slug)?.playbookType ?? null
}

export function slugFromPlaybookType(playbookType: string): PlaybookSlug | null {
  const normalized = playbookType.trim().toLowerCase()
  return PLAYBOOK_CATALOG.find((entry) => entry.playbookType === normalized)?.slug ?? null
}

export function isPlaybookCatalogEntryEnabled(entry: PlaybookCatalogEntry): boolean {
  const featureId = 'featureId' in entry ? entry.featureId : undefined
  if (!featureId) return true
  return isFeatureEnabled(featureId)
}

/** Catalog entries visible in the playbooks library for this build. */
export function getEnabledPlaybookCatalog(): PlaybookCatalogEntry[] {
  return PLAYBOOK_CATALOG.filter(isPlaybookCatalogEntryEnabled)
}

export function isPlaybookSlugEnabled(slug: string): boolean {
  const entry = getPlaybookBySlug(slug)
  if (!entry) return false
  return isPlaybookCatalogEntryEnabled(entry)
}

export function isPlaybookTypeEnabled(playbookType: string): boolean {
  const normalized = playbookType.trim().toLowerCase()
  const entry = PLAYBOOK_CATALOG.find((item) => item.playbookType === normalized)
  if (!entry) return true
  return isPlaybookCatalogEntryEnabled(entry)
}
