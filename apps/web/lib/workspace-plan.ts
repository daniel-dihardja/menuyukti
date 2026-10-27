import { getDefaultAuthenticatedPath } from '@/lib/feature-flags'

export const WORKSPACE_PLAN_FREE = 'free' as const
export const WORKSPACE_PLAN_PRO = 'pro' as const

export type WorkspacePlan = typeof WORKSPACE_PLAN_FREE | typeof WORKSPACE_PLAN_PRO

/**
 * Product tiers (Menuyukti = AI platform for restaurant marketing & operations):
 *
 * Authenticated operators land on Advisor by default (`config/feature-flags.json`);
 * plan is **not** used for capability gating (staff may still store free/pro on
 * `workspace.plan` for provisioning metadata).
 *
 * - Sign-up is Clerk-only until staff provisions a workspace (`provisionWorkspace`).
 * - Restaurant MVP surfaces (Locations, Advisor, usage) are available to signed-in
 *   operators via `config/feature-flags.json`. Media, calendar, CRM, and print shop
 *   use `audience: "admin"`. Self-serve workspace creation is disabled.
 */

/**
 * Legacy free-plan nav allowlist. Kept for tests/docs; {@link isNavKeyAllowedForPlan}
 * no longer restricts by plan.
 */
export const FREE_NAV_KEYS = new Set<string>(['home'])

/**
 * Legacy free-plan route allowlist. Kept for tests/docs;
 * {@link isPathnameAllowedForPlan} no longer restricts by plan.
 */
export const FREE_ROUTE_PREFIXES = ['/home', '/continue', '/profile'] as const

/**
 * Operator sidebar keys (documentation / tests). {@link isNavKeyAllowedForPlan}
 * allows all keys except `branches` (Locations is reached via Home / Workspace CTA).
 * Admin-audience keys are filtered via `config/feature-flags.json`.
 */
export const PRO_NAV_KEYS = new Set([
  'home',
  'dashboard',
  'chat',
  'playbooks',
  'posts',
  'media',
  'calendar',
  'crm',
  'crmApps',
  'crmRegistrations',
  'printShop',
  'services',
  'inventar',
  'team',
  'usage',
  // `staff` and other admin-only keys stay role-gated separately
])

export function normalizeWorkspacePlan(plan: string | null | undefined): WorkspacePlan {
  return plan === WORKSPACE_PLAN_PRO ? WORKSPACE_PLAN_PRO : WORKSPACE_PLAN_FREE
}

export function isProPlan(plan: string | null | undefined): boolean {
  return normalizeWorkspacePlan(plan) === WORKSPACE_PLAN_PRO
}

export function isNavKeyAllowedForPlan(navKey: string): boolean {
  // Locations (`branches`) is reached via Home / Workspace CTA, not the sidebar.
  if (navKey === 'branches') {
    return false
  }
  return true
}

/**
 * Plan no longer gates routes. Admin-audience paths are gated separately via
 * `pathnameRequiresAdmin` / `config/feature-flags.json`.
 */
export function isPathnameAllowedForPlan(): boolean {
  return true
}

/** Post-login / brand home from feature-flag `defaultAuthenticatedPath` (Advisor). */
export function getDefaultPathForPlan(): string {
  return getDefaultAuthenticatedPath()
}
