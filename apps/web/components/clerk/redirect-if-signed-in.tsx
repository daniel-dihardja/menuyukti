'use client'

import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { AUTH_RETURN_TO_QUERY, buildAuthContinueUrl } from '@/lib/auth-return-path'

/**
 * Soft-nav races after OAuth can land a client that already has a session on `/login`
 * (middleware missed the cookie). Send them through the normal post-auth continue path,
 * preserving an optional `?next=` return path from the guest menu.
 */
export function RedirectIfSignedIn() {
  const { isLoaded, isSignedIn } = useAuth()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get(AUTH_RETURN_TO_QUERY)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    window.location.assign(buildAuthContinueUrl(returnTo))
  }, [isLoaded, isSignedIn, returnTo])

  return null
}
