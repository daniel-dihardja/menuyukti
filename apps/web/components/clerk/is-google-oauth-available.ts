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
 * Temporary frontend gate: hide Google sign-in UI without removing OAuth handlers.
 * Flip to `true` to show the button again when Clerk has `oauth_google` enabled.
 */
export const SHOW_GOOGLE_SIGN_IN = false

/**
 * Returns true when Google sign-in should appear in the UI: the frontend gate is on,
 * Clerk has loaded, and Google is an authenticatable social strategy for this instance.
 */
export function isGoogleOauthAvailable(
  clerk: ClerkWithOauthEnvironment | null | undefined,
): boolean {
  if (!SHOW_GOOGLE_SIGN_IN) {
    return false
  }
  if (!clerk?.loaded) {
    return false
  }
  const strategies =
    clerk.__internal_environment?.userSettings?.authenticatableSocialStrategies ?? []
  return strategies.includes('oauth_google')
}
