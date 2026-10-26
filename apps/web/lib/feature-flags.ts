import manifest from '@/config/feature-flags.json'

export type FeatureAudience = 'all' | 'admin'

export type FeatureFlag = {
  id: string
  description?: string
  enabled: boolean
  audience: FeatureAudience
  routePrefixes: string[]
  routePatterns?: string[]
  navKeys: string[]
  actionMenuKeys?: string[]
  analyticsReportSegments?: string[]
  /** GraphQL `serviceKey` values gated by this feature (services catalog). */
  serviceKeys?: string[]
}

type FeatureFlagsManifest = {
  defaultAuthenticatedPath: string
  features: FeatureFlag[]
}

const flags = manifest as FeatureFlagsManifest
const features: readonly FeatureFlag[] = flags.features

/** Fallbacks when `defaultAuthenticatedPath` is disabled or missing. */
const DEFAULT_AUTH_FALLBACKS = ['/analytics/locations', '/advisor', '/profile'] as const

function normalizePathname(pathname: string): string {
  const q = pathname.indexOf('?')
  const base = q === -1 ? pathname : pathname.slice(0, q)
  if (base === '' || base[0] !== '/') {
    return `/${base.replace(/^\//, '')}`
  }
  return base
}

function pathSegments(pathname: string): string[] {
  return normalizePathname(pathname).split('/').filter(Boolean)
}

/** `*` matches exactly one non-empty segment. */
function pathMatchesPattern(pathname: string, pattern: string): boolean {
  const pathParts = pathSegments(pathname)
  const patternParts = pathSegments(pattern)
  if (pathParts.length !== patternParts.length) return false
  for (let i = 0; i < patternParts.length; i++) {
    const expected = patternParts[i]!
    const actual = pathParts[i]!
    if (expected === '*') {
      if (!actual) return false
      continue
    }
    if (expected !== actual) return false
  }
  return true
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  const path = normalizePathname(pathname)
  return path === prefix || path.startsWith(`${prefix}/`)
}

type PathMatch = { feature: FeatureFlag; score: number }

/**
 * Prefer route patterns, then analytics report segments, then longest route prefix.
 * Unlisted paths yield null (fail open).
 */
function resolveFeatureForPath(pathname: string): FeatureFlag | null {
  const path = normalizePathname(pathname)
  const matches: PathMatch[] = []

  for (const feature of features) {
    for (const pattern of feature.routePatterns ?? []) {
      if (pathMatchesPattern(path, pattern)) {
        matches.push({ feature, score: 10_000 + path.length })
      }
    }
    for (const prefix of feature.routePrefixes) {
      if (prefix.startsWith('/') && pathMatchesPrefix(path, prefix)) {
        matches.push({ feature, score: prefix.length })
      }
    }
  }

  const analyticsMatch = path.match(/^\/analytics\/[^/]+\/([^/]+)/)
  if (analyticsMatch) {
    const segment = analyticsMatch[1]!
    for (const feature of features) {
      if (feature.analyticsReportSegments?.includes(segment)) {
        matches.push({ feature, score: 5_000 + path.length })
      }
    }
  }

  if (matches.length === 0) return null
  let best = matches[0]!
  for (let i = 1; i < matches.length; i++) {
    const candidate = matches[i]!
    if (candidate.score > best.score) best = candidate
  }
  return best.feature
}

const navKeyToFeature = new Map<string, FeatureFlag>()
for (const feature of features) {
  for (const key of feature.navKeys) {
    navKeyToFeature.set(key, feature)
  }
}

const actionKeyToFeature = new Map<string, FeatureFlag>()
for (const feature of features) {
  for (const key of feature.actionMenuKeys ?? []) {
    actionKeyToFeature.set(key, feature)
  }
}

const featureById = new Map<string, FeatureFlag>()
for (const feature of features) {
  featureById.set(feature.id, feature)
}

const serviceKeyToFeature = new Map<string, FeatureFlag>()
for (const feature of features) {
  for (const key of feature.serviceKeys ?? []) {
    serviceKeyToFeature.set(key, feature)
  }
}

const adminNavKeys = new Set<string>()
const adminActionMenuKeys = new Set<string>()
for (const feature of features) {
  if (feature.audience !== 'admin' || !feature.enabled) continue
  for (const key of feature.navKeys) adminNavKeys.add(key)
  for (const key of feature.actionMenuKeys ?? []) adminActionMenuKeys.add(key)
}

/** Sidebar `NavItem.key` values that are only shown to platform admins when enabled. */
export const adminOnlyNavKeys: ReadonlySet<string> = adminNavKeys

/** Action-menu item `id`s that are only shown to platform admins when enabled. */
export const adminOnlyActionMenuKeys: ReadonlySet<string> = adminActionMenuKeys

/**
 * Whether a sidenav `NavItem.key` is enabled for this build.
 * Unknown keys fail open (`true`) so new nav entries are visible until flagged.
 */
export function isNavKeyEnabled(navKey: string): boolean {
  const feature = navKeyToFeature.get(navKey)
  if (!feature) return true
  return feature.enabled
}

/**
 * Whether a pathname is allowed by feature route flags.
 * Most specific matching feature wins; paths with no match stay enabled.
 */
export function isPathnameFeatureEnabled(pathname: string): boolean {
  const feature = resolveFeatureForPath(pathname)
  if (!feature) return true
  return feature.enabled
}

/**
 * Whether the path belongs to an enabled admin-audience feature.
 * Disabled features are blocked by {@link isPathnameFeatureEnabled} instead.
 */
export function pathnameRequiresAdmin(pathname: string): boolean {
  const feature = resolveFeatureForPath(pathname)
  if (!feature || !feature.enabled) return false
  return feature.audience === 'admin'
}

export function isNavItemHiddenFromNonAdmin(navKey: string): boolean {
  return adminOnlyNavKeys.has(navKey)
}

export function isActionMenuItemHiddenFromNonAdmin(actionId: string): boolean {
  return adminOnlyActionMenuKeys.has(actionId)
}

/**
 * Whether an action-menu item is enabled for this build.
 * Unknown ids fail open (`true`).
 */
export function isActionMenuKeyEnabled(actionId: string): boolean {
  const feature = actionKeyToFeature.get(actionId)
  if (!feature) return true
  return feature.enabled
}

/**
 * Whether a catalog feature id is enabled for this build.
 * Unknown ids fail open (`true`).
 */
export function isFeatureEnabled(featureId: string): boolean {
  const feature = featureById.get(featureId)
  if (!feature) return true
  return feature.enabled
}

/**
 * Whether a GraphQL `serviceKey` is enabled for the services catalog / overview.
 * Unknown keys fail open (`true`).
 */
export function isServiceKeyFeatureEnabled(serviceKey: string): boolean {
  const feature = serviceKeyToFeature.get(serviceKey)
  if (!feature) return true
  return feature.enabled
}

/**
 * Post-login / signed-in home path from config.
 * If that path is feature-disabled, returns the first enabled fallback among
 * `/analytics/locations`, `/advisor`, `/profile`, else `/profile`.
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
