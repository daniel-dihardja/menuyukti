import { isPublicLocationSurfacePath, routes } from '@/lib/routes'

/** Query param on `/continue` and `/login` for post-auth return. */
export const AUTH_RETURN_TO_QUERY = 'next'

/** sessionStorage key so OAuth callback can recover the pre-auth page. */
export const AUTH_RETURN_TO_STORAGE_KEY = 'menuyukti:authReturnTo'

/**
 * Only allow same-app relative paths on public location surfaces (`/m/*`, `/l/*`).
 * Rejects open redirects (`//…`, absolute URLs, other app routes).
 */
export function getSafeAuthReturnPath(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('://') || trimmed.includes('\\')) return null

  let pathname = trimmed
  try {
    const url = new URL(trimmed, 'http://local.invalid')
    if (url.origin !== 'http://local.invalid') return null
    pathname = url.pathname
  } catch {
    return null
  }

  if (!isPublicLocationSurfacePath(pathname)) return null
  return pathname
}

/** Post-auth URL: public menu return path when safe, otherwise plan-aware `/continue`. */
export function buildAuthContinueUrl(returnTo?: string | null): string {
  const safe = getSafeAuthReturnPath(returnTo)
  // Skip `/continue` for guest menus — that route is auth-gated and briefly
  // redirects to `/login` when the session cookie is not visible yet (common on mobile).
  if (safe) return safe
  return routes.authContinue
}

/** `/login` or `/login?next=/m/slug` for email sign-in from a guest surface. */
export function buildLoginUrl(returnTo?: string | null): string {
  const safe = getSafeAuthReturnPath(returnTo)
  if (!safe) return routes.login
  return `${routes.login}?${AUTH_RETURN_TO_QUERY}=${encodeURIComponent(safe)}`
}

export function rememberAuthReturnPath(pathname: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const safe = getSafeAuthReturnPath(pathname)
  if (!safe) return
  try {
    sessionStorage.setItem(AUTH_RETURN_TO_STORAGE_KEY, safe)
  } catch {
    // private mode / disabled storage — query param on redirectUrl still works
  }
}

/** Read a stored return path without clearing (e.g. SSO fallback to login). */
export function peekAuthReturnPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return getSafeAuthReturnPath(sessionStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY))
  } catch {
    return null
  }
}

/** Read and clear a stored return path (OAuth callback / continue). */
export function consumeAuthReturnPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY)
    return getSafeAuthReturnPath(raw)
  } catch {
    return null
  }
}
