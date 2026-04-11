'use client'

import { useUser } from '@clerk/nextjs'

import { ProfileChangePasswordForm } from './profile-change-password-form'
import { ProfileChangePasswordSkeleton } from './profile-change-password-skeleton'
import { ProfilePasswordAccountPrompt } from './profile-password-account-prompt'

export type ProfileChangePasswordCardProps = {
  /**
   * From `currentUser()`: avoids a loading skeleton for the common OAuth-only path.
   * Client `useUser()` still reconciles if this ever disagrees with the live session.
   */
  passwordEnabledFromServer: boolean
}

function ProfileChangePasswordWithUser() {
  const { isLoaded, user } = useUser()

  if (!isLoaded) {
    return <ProfileChangePasswordSkeleton variant="form" />
  }

  if (!user) {
    return null
  }

  if (!user.passwordEnabled) {
    return <ProfilePasswordAccountPrompt />
  }

  return <ProfileChangePasswordForm user={user} />
}

/**
 * OAuth-first path: show account prompt immediately; swap to the password form if the client
 * session reports `passwordEnabled` (e.g. user added a password since the server render).
 */
function ProfilePasswordMaybeOAuth() {
  const { isLoaded, user } = useUser()

  if (!isLoaded) {
    return <ProfilePasswordAccountPrompt />
  }

  if (!user) {
    return null
  }

  if (user.passwordEnabled) {
    return <ProfileChangePasswordForm user={user} />
  }

  return <ProfilePasswordAccountPrompt />
}

/**
 * Orchestrates password UI variants: loading skeleton, OAuth prompt, or change-password form.
 */
export function ProfileChangePasswordCard({
  passwordEnabledFromServer,
}: ProfileChangePasswordCardProps) {
  if (passwordEnabledFromServer) {
    return <ProfileChangePasswordWithUser />
  }

  return <ProfilePasswordMaybeOAuth />
}
