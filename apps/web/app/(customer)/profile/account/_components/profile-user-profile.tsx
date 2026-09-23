'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import { menuyuktiClerkAppearance } from '@/components/clerk/menuyukti-appearance'
import { routes } from '@/lib/routes'

function UserProfileLoading() {
  return (
    <div className="flex min-h-[24rem] w-full max-w-4xl flex-col gap-4" aria-hidden>
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="min-h-[18rem] w-full flex-1 rounded-lg" />
    </div>
  )
}

const ClerkUserProfile = dynamic(
  () => import('@clerk/nextjs').then((mod) => ({ default: mod.UserProfile })),
  {
    loading: () => <UserProfileLoading />,
    ssr: false,
  },
)

export function ProfileUserProfile() {
  return (
    <ClerkUserProfile
      appearance={menuyuktiClerkAppearance}
      path={routes.profileAccount}
      routing="path"
    />
  )
}
