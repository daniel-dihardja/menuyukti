'use client'

import { useAuth, useUser } from '@clerk/nextjs'

import {
  getMenuyuktiRoleFromPublicMetadata,
  getMenuyuktiRoleFromSessionClaims,
  type MenuyuktiRole,
} from '@/lib/menuyukti-role'

export function useMenuyuktiRole(): { role: MenuyuktiRole; isLoaded: boolean } {
  const { isLoaded: authLoaded, sessionClaims } = useAuth()
  const { isLoaded: userLoaded, user } = useUser()

  const fromClaims = getMenuyuktiRoleFromSessionClaims(sessionClaims ?? undefined)
  const fromUser = user
    ? getMenuyuktiRoleFromPublicMetadata(user.publicMetadata as Record<string, unknown>)
    : 'user'

  const role: MenuyuktiRole = fromClaims !== null ? fromClaims : fromUser

  return {
    role,
    isLoaded: authLoaded && userLoaded,
  }
}
