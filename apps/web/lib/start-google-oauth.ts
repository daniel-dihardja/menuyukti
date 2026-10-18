import { toAbsoluteAppUrl } from '@/lib/auth-return-path'
import { routes } from '@/lib/routes'

type GoogleSsoSignIn = {
  sso: (params: {
    strategy: 'oauth_google'
    redirectUrl: string
    redirectCallbackUrl: string
  }) => Promise<{ error: unknown }>
}

/**
 * Start Google OAuth via Clerk custom `signIn.sso`.
 * Uses absolute app URLs so redirects are not resolved against the Clerk FAPI host.
 * The page must mount `#clerk-captcha` or bot protection can leave SSO stuck on
 * “Continuing with Google…”.
 */
export async function startGoogleOauthSignIn(options: {
  signIn: GoogleSsoSignIn
  /** Post-auth app path or absolute URL (e.g. `/home`). */
  redirectUrl: string
}): Promise<{ error: unknown }> {
  return options.signIn.sso({
    strategy: 'oauth_google',
    redirectUrl: toAbsoluteAppUrl(options.redirectUrl),
    redirectCallbackUrl: toAbsoluteAppUrl(routes.ssoCallback),
  })
}

export function isCaptchaOauthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code =
    'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : null
  if (code === 'captcha_unavailable' || code === 'protect_check_required') return true
  if ('errors' in error && Array.isArray((error as { errors: unknown[] }).errors)) {
    return (error as { errors: Array<{ code?: string }> }).errors.some(
      (e) => e.code === 'captcha_unavailable' || e.code === 'protect_check_required',
    )
  }
  return false
}
