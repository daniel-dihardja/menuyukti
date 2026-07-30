import manifest from '@/config/feature-flags.json'

type FeatureFlagsManifest = {
  nav: Record<string, boolean>
  routes: Record<string, boolean>
  defaultAuthenticatedPath: string
}

const flags = manifest as FeatureFlagsManifest

/** Fallbacks when `defaultAuthenticatedPath` is disabled or missing. */
const DEFAULT_AUTH_FALLBACKS = ['/advisor', '/analytics/sales', '/profile'] as const

function normalizePathname(pathname: string): string {
  const q = pathname.indexOf('?')
  const base = q === -1 ? pathname : pathname.slice(0, q)
  if (base === '' || base[0] !== '/') {
    return `/${base.replace(/^\//, '')}`
  }
  return base
}

/** Route prefixes from config, longest first for prefix matching. */
const routePrefixesLongestFirst: readonly string[] = Object.keys(flags.routes).sort(
  (a, b) => b.length - a.length,
)

/**
 * Whether a sidenav `NavItem.key` is enabled for this build.
 * Unknown keys fail open (`true`) so new nav entries are visible until flagged.
 */
export function isNavKeyEnabled(navKey: string): boolean {
  if (!(navKey in flags.nav)) {
    return true
  }
  return flags.nav[navKey] === true
}

/**
 * Whether a pathname is allowed by feature route flags.
 * Uses longest matching prefix; paths with no listed prefix stay enabled.
 */
export function isPathnameFeatureEnabled(pathname: string): boolean {
  const path = normalizePathname(pathname)
  for (const prefix of routePrefixesLongestFirst) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return flags.routes[prefix] === true
    }
  }
  return true
}

/**
 * Post-login / signed-in home path from config.
 * If that path is feature-disabled, returns the first enabled fallback among
 * `/advisor`, `/analytics/sales`, `/profile`, else `/profile`.
 */
export function getDefaultAuthenticatedPath(): string {
  const configured = flags.defaultAuthenticatedPath || '/dashboard'
  if (isPathnameFeatureEnabled(configured)) {
    return configured
  }
  for (const fallback of DEFAULT_AUTH_FALLBACKS) {
    if (isPathnameFeatureEnabled(fallback)) {
      return fallback
    }
  }
  return '/profile'
}
