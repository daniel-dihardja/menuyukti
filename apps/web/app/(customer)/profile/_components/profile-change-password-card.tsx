'use client'

import { useUser } from '@clerk/nextjs'

import { ProfileChangePasswordForm } from './profile-change-password-form'
import { ProfileChangePasswordSkeleton } from './profile-change-password-skeleton'

/** Single password section for every signed-in user (set or update). */
export function ProfileChangePasswordCard() {
  const { isLoaded, user } = useUser()

  if (!isLoaded) {
    return <ProfileChangePasswordSkeleton />
  }

  if (!user) {
    return null
  }

  return <ProfileChangePasswordForm user={user} />
}
