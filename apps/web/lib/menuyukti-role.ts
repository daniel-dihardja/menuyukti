/**
 * Menuyukti platform roles (Clerk public user metadata + session token claims).
 *
 * ## Clerk Dashboard setup
 *
 * 1. **Public metadata** (Users → select user → Public metadata), or Backend API:
 *    `{ "menuyuktiRole": "admin" }` for staff. Omit or use `"user"` for customers.
 *
 * 2. **Customize session token** (Sessions → Customize session token) so `auth()`
 *    and the auth proxy receive the role without an extra `users.getUser` call. Example
 *    claims JSON (syntax may vary slightly by Clerk version—use the dashboard helper
 *    to insert user public metadata):
 *
 * ```json
 * {
 *   "menuyukti": {
 *     "role": "{{user.public_metadata.menuyuktiRole}}"
 *   }
 * }
 * ```
 *
 * If the token omits `menuyukti`, the app falls back to `currentUser().publicMetadata`
 * on the server and `useUser()` on the client (slower / extra client fetch).
 */

export const MENUYUKTI_ROLES = ['user', 'admin'] as const

export type MenuyuktiRole = (typeof MENUYUKTI_ROLES)[number]

const METADATA_KEY = 'menuyuktiRole'

export function normalizeMenuyuktiRole(raw: unknown): MenuyuktiRole {
  if (raw === 'admin') return 'admin'
  return 'user'
}

/** Read role from JWT/session claims (`menuyukti.role`). Returns `null` if claim absent. */
export function getMenuyuktiRoleFromSessionClaims(
  claims: CustomJwtSessionClaims | Record<string, unknown> | null | undefined,
): MenuyuktiRole | null {
  if (claims == null || typeof claims !== 'object') return null
  const menuyukti = (claims as { menuyukti?: unknown }).menuyukti
  if (menuyukti == null || typeof menuyukti !== 'object') return null
  const role = (menuyukti as { role?: unknown }).role
  if (role === undefined) return null
  return normalizeMenuyuktiRole(role)
}

/** Read role from Clerk `User.publicMetadata` (browser-safe). */
export function getMenuyuktiRoleFromPublicMetadata(
  publicMetadata: Record<string, unknown> | null | undefined,
): MenuyuktiRole {
  if (!publicMetadata) return 'user'
  return normalizeMenuyuktiRole(publicMetadata[METADATA_KEY])
}

export function isMenuyuktiAdmin(role: MenuyuktiRole): boolean {
  return role === 'admin'
}
