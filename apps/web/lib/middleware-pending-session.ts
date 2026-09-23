import { CUSTOMER_AUTH_PREFIXES, OPERATOR_APP_SHELL_PREFIXES, routes } from '@/lib/routes'

/** Auth surfaces where pending sessions complete MFA / session tasks (see custom-login-form). */
const AUTH_ROUTE_PREFIXES = [routes.login, routes.signUp, routes.ssoCallback] as const

/** Protected in proxy but not listed in shell prefix arrays (legacy / rewrite alias). */
const EXTRA_PROTECTED_PREFIXES = ['/agent'] as const

function matchesRoutePrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Whether the auth proxy should redirect a pending Clerk session to `/login`.
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
    ...OPERATOR_APP_SHELL_PREFIXES,
    ...CUSTOMER_AUTH_PREFIXES,
    ...EXTRA_PROTECTED_PREFIXES,
  ])
}
