'use client'

import { SignUp } from '@clerk/nextjs'
import { routes } from '@/lib/routes'
import { menuyuktiClerkAppearance } from './menuyukti-appearance'

export function MenuyuktiSignUp() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl={routes.login}
      forceRedirectUrl={routes.dashboard}
      appearance={menuyuktiClerkAppearance}
    />
  )
}
