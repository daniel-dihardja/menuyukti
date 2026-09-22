/** Minimal Clerk shape needed to detect whether Google OAuth is enabled for auth. */
type ClerkWithOauthEnvironment = {
  loaded?: boolean
  __internal_environment?: {
    userSettings?: {
      authenticatableSocialStrategies?: readonly string[] | null
    } | null
  } | null
}

/**
 * Returns true when Clerk has loaded and Google is an authenticatable social strategy
 * for the current instance (Dashboard SSO connection enabled for sign-in/sign-up).
 */
export function isGoogleOauthAvailable(
  clerk: ClerkWithOauthEnvironment | null | undefined,
): boolean {
  if (!clerk?.loaded) {
    return false
  }
  const strategies =
    clerk.__internal_environment?.userSettings?.authenticatableSocialStrategies ?? []
  return strategies.includes('oauth_google')
}
