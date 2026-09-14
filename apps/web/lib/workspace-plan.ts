import { routes } from '@/lib/routes'

export const WORKSPACE_PLAN_FREE = 'free' as const
export const WORKSPACE_PLAN_PRO = 'pro' as const

export type WorkspacePlan = typeof WORKSPACE_PLAN_FREE | typeof WORKSPACE_PLAN_PRO

/** Sidebar `NavItem.key` values visible on the free plan. */
export const FREE_NAV_KEYS = new Set([
  'reports',
  'branches',
  'inventar',
  'team',
  'usage',
])

/**
 * Path prefixes allowed for free workspaces.
 * Report detail pages under `/analytics/<id>/…` are allowed separately.
 */
export const FREE_ROUTE_PREFIXES = [
  '/analytics/locations',
  '/analytics/sales',
  '/inventar',
  '/profile',
  '/usage',
] as const

export function normalizeWorkspacePlan(plan: string | null | undefined): WorkspacePlan {
  return plan === WORKSPACE_PLAN_PRO ? WORKSPACE_PLAN_PRO : WORKSPACE_PLAN_FREE
}

export function isProPlan(plan: string | null | undefined): boolean {
  return normalizeWorkspacePlan(plan) === WORKSPACE_PLAN_PRO
}

export function isNavKeyAllowedForPlan(navKey: string, plan: string | null | undefined): boolean {
  if (isProPlan(plan)) return true
  return FREE_NAV_KEYS.has(navKey)
}

function normalizePathname(pathname: string): string {
  const q = pathname.indexOf('?')
  const base = q === -1 ? pathname : pathname.slice(0, q)
  if (base === '' || base[0] !== '/') {
    return `/${base.replace(/^\//, '')}`
  }
  return base
}

/** `/analytics/123` or `/analytics/123/matrix` — sales report detail routes. */
function isAnalyticsReportDetailPath(path: string): boolean {
  return /^\/analytics\/\d+(\/|$)/.test(path)
}

export function isPathnameAllowedForPlan(
  pathname: string,
  plan: string | null | undefined,
): boolean {
  if (isProPlan(plan)) return true
  const path = normalizePathname(pathname)
  for (const prefix of FREE_ROUTE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true
    }
  }
  return isAnalyticsReportDetailPath(path)
}

/** Post-login / brand home for the workspace plan. */
export function getDefaultPathForPlan(plan: string | null | undefined): string {
  if (isProPlan(plan)) {
    return routes.agent
  }
  return routes.analytics.branches
}
