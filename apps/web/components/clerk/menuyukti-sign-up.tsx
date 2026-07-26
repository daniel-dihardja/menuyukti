'use client'

import { SignUp } from '@clerk/nextjs'
import { getDefaultAuthenticatedPath } from '@/lib/feature-flags'
import { routes } from '@/lib/routes'
import { menuyuktiClerkAppearance } from './menuyukti-appearance'

export function MenuyuktiSignUp() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl={routes.login}
      forceRedirectUrl={getDefaultAuthenticatedPath()}
      appearance={menuyuktiClerkAppearance}
    />
  )
}
