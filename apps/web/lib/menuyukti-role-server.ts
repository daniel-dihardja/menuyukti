import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  getMenuyuktiRoleFromPublicMetadata,
  getMenuyuktiRoleFromSessionClaims,
  isMenuyuktiAdmin,
  type MenuyuktiRole,
} from '@/lib/menuyukti-role'
import { getDefaultAuthenticatedPath } from '@/lib/feature-flags'
import { routes } from '@/lib/routes'

/**
 * Resolve platform role for the active session: session claims first, then Clerk user
 * public metadata (extra round trip when claims are not customized in Dashboard).
 */
export async function resolveMenuyuktiRole(): Promise<MenuyuktiRole> {
  const { sessionClaims } = await auth()
  const fromClaims = getMenuyuktiRoleFromSessionClaims(sessionClaims ?? undefined)
  if (fromClaims !== null) return fromClaims

  const user = await currentUser()
  if (!user) return 'user'
  return getMenuyuktiRoleFromPublicMetadata(
    user.publicMetadata as Record<string, unknown> | undefined,
  )
}

/** Redirects to login if signed out, dashboard if signed in but not platform admin. */
export async function requireMenuyuktiAdmin(): Promise<void> {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    redirect(routes.login)
  }
  const role = await resolveMenuyuktiRole()
  if (!isMenuyuktiAdmin(role)) {
    redirect(getDefaultAuthenticatedPath())
  }
}
