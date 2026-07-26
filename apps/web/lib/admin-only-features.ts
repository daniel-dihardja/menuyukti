import manifest from '@/config/admin-only-features.json'

type AdminOnlyFeatureManifest = {
  features: Array<{
    id: string
    description: string
    routePrefixes: string[]
    navKeys: string[]
    actionMenuKeys?: string[]
    analyticsReportSegments?: string[]
  }>
}

const { features } = manifest as AdminOnlyFeatureManifest

function normalizePathname(pathname: string): string {
  const q = pathname.indexOf('?')
  const base = q === -1 ? pathname : pathname.slice(0, q)
  if (base === '' || base[0] !== '/') {
    return `/${base.replace(/^\//, '')}`
  }
  return base
}

/** Unique route prefixes, longest first, for prefix matching. */
export const adminOnlyRoutePrefixes: readonly string[] = (() => {
  const set = new Set<string>()
  for (const f of features) {
    for (const p of f.routePrefixes) {
      if (p.startsWith('/')) set.add(p)
    }
  }
  return [...set].sort((a, b) => b.length - a.length)
})()

const navKeySet = new Set<string>()
for (const f of features) {
  for (const k of f.navKeys) {
    navKeySet.add(k)
  }
}

/** Sidebar `NavItem.key` values that are only shown to platform admins. */
export const adminOnlyNavKeys: ReadonlySet<string> = navKeySet

const actionMenuKeySet = new Set<string>()
for (const f of features) {
  for (const k of f.actionMenuKeys ?? []) {
    actionMenuKeySet.add(k)
  }
}

/** Sales (and similar) action-menu item `id`s that are only shown to platform admins. */
export const adminOnlyActionMenuKeys: ReadonlySet<string> = actionMenuKeySet

const analyticsReportSegmentSet = new Set<string>()
for (const f of features) {
  for (const s of f.analyticsReportSegments ?? []) {
    analyticsReportSegmentSet.add(s)
  }
}

export function pathnameRequiresAdmin(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (adminOnlyRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return true
  }
  const analyticsMatch = path.match(/^\/analytics\/[^/]+\/([^/]+)/)
  return analyticsMatch != null && analyticsReportSegmentSet.has(analyticsMatch[1]!)
}

export function isNavItemHiddenFromNonAdmin(navKey: string): boolean {
  return adminOnlyNavKeys.has(navKey)
}

export function isActionMenuItemHiddenFromNonAdmin(actionId: string): boolean {
  return adminOnlyActionMenuKeys.has(actionId)
}
