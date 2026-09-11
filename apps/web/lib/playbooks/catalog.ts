export const PLAYBOOK_CATALOG = [
  {
    id: 'publicHolidays',
    slug: 'public-holidays',
    playbookType: 'public_holidays',
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
