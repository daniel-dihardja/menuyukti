'use client'

import { useUser } from '@clerk/nextjs'

import { ProfileChangePasswordForm } from './profile-change-password-form'
import { ProfileChangePasswordSkeleton } from './profile-change-password-skeleton'
import { ProfilePasswordAccountPrompt } from './profile-password-account-prompt'

export type ProfileChangePasswordCardProps = {
  /**
   * From `currentUser()`: which skeleton to show before `useUser()` resolves.
   * - `true`: user likely has a password (three-field skeleton).
   * - `false`: likely OAuth-only (compact skeleton).
   */
  passwordEnabledFromServer: boolean
}

/**
 * Orchestrates password UI variants: loading skeleton, OAuth prompt, or change-password form.
 */
export function ProfileChangePasswordCard({
  passwordEnabledFromServer,
}: ProfileChangePasswordCardProps) {
  const { isLoaded, user } = useUser()

  if (!isLoaded) {
    return (
      <ProfileChangePasswordSkeleton variant={passwordEnabledFromServer ? 'form' : 'compact'} />
    )
  }

  if (!user) {
    return null
  }

  if (!user.passwordEnabled) {
    return <ProfilePasswordAccountPrompt />
  }

  return <ProfileChangePasswordForm user={user} />
}
