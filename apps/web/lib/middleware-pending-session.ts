import { PROTECTED_APP_SHELL_PREFIXES, routes } from '@/lib/routes'

/** Auth surfaces where pending sessions complete MFA / session tasks (see custom-login-form). */
const AUTH_ROUTE_PREFIXES = [routes.login, routes.signUp, routes.ssoCallback] as const

/** Protected in middleware but not listed in `PROTECTED_APP_SHELL_PREFIXES` (legacy / rewrite alias). */
const EXTRA_PROTECTED_PREFIXES = ['/agent'] as const

function matchesRoutePrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Whether middleware should redirect a pending Clerk session to `/login`.
 * Pending users on auth routes must stay put so the client MFA flow can finish.
 */
export function shouldRedirectPendingSession(
  pathname: string,
  sessionStatus: string | null | undefined,
): boolean {
  if (sessionStatus !== 'pending') {
    return false
  }
  if (matchesRoutePrefix(pathname, AUTH_ROUTE_PREFIXES)) {
    return false
  }
  return matchesRoutePrefix(pathname, [
    ...PROTECTED_APP_SHELL_PREFIXES,
    ...EXTRA_PROTECTED_PREFIXES,
  ])
}
