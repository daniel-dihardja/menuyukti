'use client'

import { UserProfile } from '@clerk/nextjs'

import { menuyuktiClerkAppearance } from '@/components/clerk/menuyukti-appearance'
import { routes } from '@/lib/routes'

export function ProfileUserProfile() {
  return (
    <UserProfile
      appearance={menuyuktiClerkAppearance}
      path={routes.profileAccount}
      routing="path"
    />
  )
}
