export const PLAYBOOK_CATALOG = [
  {
    id: 'publicHolidays',
    slug: 'public-holidays',
  },
] as const

export type PlaybookCatalogEntry = (typeof PLAYBOOK_CATALOG)[number]
export type PlaybookId = PlaybookCatalogEntry['id']
export type PlaybookSlug = PlaybookCatalogEntry['slug']

export function getPlaybookBySlug(slug: string): PlaybookCatalogEntry | null {
  return PLAYBOOK_CATALOG.find((entry) => entry.slug === slug) ?? null
}
