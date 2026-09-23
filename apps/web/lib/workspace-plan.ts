import { routes } from '@/lib/routes'

export const WORKSPACE_PLAN_FREE = 'free' as const
export const WORKSPACE_PLAN_PRO = 'pro' as const

export type WorkspacePlan = typeof WORKSPACE_PLAN_FREE | typeof WORKSPACE_PLAN_PRO

/**
 * Product tiers (Menuyukti = creative agency for restaurants, cafés, and bars):
 *
 * - **free** / no workspace — guest / customer accounts (mainly PWA). Sign-up is
 *   Clerk-only until staff provisions a workspace. Customer shell: `/home` + `/profile`
 *   under `app/(customer)/` (no operator sidebar).
 * - **pro** — restaurant-owner clients; staff-provisioned via the staff console
 *   (`provisionWorkspace`). Full operator product surface (everything free does
 *   not include). Self-serve workspace creation is disabled.
 */

/**
 * Sidebar `NavItem.key` values visible on the free plan when the operator shell
 * is somehow rendered. Free users normally never enter `(protected)` — Home lives
 * in the customer shell. Profile stays in the account menu.
 */
export const FREE_NAV_KEYS = new Set<string>(['home'])

/**
 * Path prefixes allowed for free (guest) workspaces.
 * `/continue` is the plan-aware post-auth redirect; `/profile/team` is blocked separately.
 */
export const FREE_ROUTE_PREFIXES = ['/home', '/continue', '/profile'] as const

/** Paths under `/profile` that free workspaces must not access. */
const FREE_PROFILE_BLOCKED_PREFIXES = ['/profile/team'] as const

/**
 * Operator sidebar keys that pro always receives (contrast with free’s Home-only nav).
 * Kept for documentation and tests; {@link isNavKeyAllowedForPlan} allows all keys on pro
 * except `home` (guest-only).
 */
export const PRO_NAV_KEYS = new Set([
  'dashboard',
  'chat',
  'playbooks',
  'posts',
  'media',
  'calendar',
  'branches',
  'crm',
  'crmApps',
  'crmRegistrations',
  'printShop',
  'inventar',
  'team',
  'usage',
  // `staff` stays admin-gated separately
])

export function normalizeWorkspacePlan(plan: string | null | undefined): WorkspacePlan {
  return plan === WORKSPACE_PLAN_PRO ? WORKSPACE_PLAN_PRO : WORKSPACE_PLAN_FREE
}

export function isProPlan(plan: string | null | undefined): boolean {
  return normalizeWorkspacePlan(plan) === WORKSPACE_PLAN_PRO
}

export function isNavKeyAllowedForPlan(navKey: string, plan: string | null | undefined): boolean {
  // Guest home is free-only — operators stay chat-first without a redundant Home entry.
  if (navKey === 'home') {
    return !isProPlan(plan)
  }
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

/**
 * Free: customer home, post-auth continue, and profile (+ account settings).
 * Pro: unrestricted — full operator app (locations, inventar, advisor, usage, team, …).
 */
export function isPathnameAllowedForPlan(
  pathname: string,
  plan: string | null | undefined,
): boolean {
  if (isProPlan(plan)) return true
  const path = normalizePathname(pathname)
  for (const blocked of FREE_PROFILE_BLOCKED_PREFIXES) {
    if (path === blocked || path.startsWith(`${blocked}/`)) {
      return false
    }
  }
  for (const prefix of FREE_ROUTE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true
    }
  }
  return false
}

/** Post-login / brand home: guests → `/home`; restaurant clients → advisor. */
export function getDefaultPathForPlan(plan: string | null | undefined): string {
  if (isProPlan(plan)) {
    return routes.agent
  }
  return routes.home
}
