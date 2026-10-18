'use client'

import { HandleSSOCallback } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

import {
  buildAuthContinueUrl,
  buildLoginUrl,
  consumeAuthReturnPath,
  peekAuthReturnPath,
} from '@/lib/auth-return-path'

/**
 * Completes OAuth / SSO redirects from {@link CustomLoginForm} `signIn.sso`.
 * Uses Clerk’s official {@link HandleSSOCallback} (handles captcha / transfer / MFA handoff).
 */
export function SsoCallbackView() {
  const router = useRouter()

  const goToLogin = () => {
    router.push(buildLoginUrl(peekAuthReturnPath()))
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          // Session tasks (e.g. MFA setup) — leave Clerk / app task routing to handle next.
          if (session?.currentTask) {
            return
          }
          const homePath = buildAuthContinueUrl(consumeAuthReturnPath())
          const url = decorateUrl(homePath)
          // Hard navigation so the session cookie is visible to middleware.
          if (url.startsWith('http')) {
            window.location.href = url
          } else {
            window.location.assign(url)
          }
        }}
        navigateToSignIn={goToLogin}
        navigateToSignUp={goToLogin}
      />
    </div>
  )
}
