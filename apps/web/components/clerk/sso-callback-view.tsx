'use client'

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { routes } from '@/lib/routes'
import {
  buildAuthContinueUrl,
  consumeAuthReturnPath,
} from '@/lib/auth-return-path'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

function isSessionExistsError(error: unknown): boolean {
  if (!error) return false
  if (isClerkAPIResponseError(error)) {
    return error.errors.some((e) => e.code === 'session_exists')
  }
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const errors = (error as { errors?: Array<{ code?: string }> }).errors
    return Boolean(errors?.some((e) => e.code === 'session_exists'))
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code === 'session_exists'
  }
  return false
}

/**
 * Completes OAuth / SSO redirects from {@link CustomLoginForm} `signIn.sso`.
 * Pattern follows Clerk’s custom OAuth flow.
 */
export function SsoCallbackView() {
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()
  const hasRun = useRef(false)

  const resolveHomePath = () => buildAuthContinueUrl(consumeAuthReturnPath())

  const navigateHome = () => {
    // Hard navigation so the session cookie is visible to middleware on /continue.
    window.location.assign(resolveHomePath())
  }

  const navigateAfterFinalize = async ({
    session,
    decorateUrl,
  }: {
    session: { currentTask?: unknown } | null | undefined
    decorateUrl: (url: string) => string
  }) => {
    if (session?.currentTask) {
      return
    }
    const homePath = resolveHomePath()
    const url = decorateUrl(homePath)
    if (url.startsWith('http')) {
      window.location.href = url
    } else {
      window.location.assign(url)
    }
  }

  const navigateToSignIn = () => {
    router.push(routes.login)
  }

  const navigateToSignUp = () => {
    router.push(routes.signUp)
  }

  useEffect(() => {
    void (async () => {
      if (!clerk.loaded || hasRun.current) {
        return
      }
      hasRun.current = true

      // OAuth often creates the session before this page runs. Treat that as success —
      // do not start another sign-in (that yields session_exists → bounce to /login).
      if (clerk.session) {
        navigateHome()
        return
      }

      const activateExistingSession = async (sessionId: string) => {
        await clerk.setActive({
          session: sessionId,
          navigate: navigateAfterFinalize,
        })
      }

      try {
        if (signIn.status === 'complete') {
          await signIn.finalize({
            navigate: navigateAfterFinalize,
          })
          return
        }

        // Prefer activating an existing session over transfer / first-factor fallbacks.
        if (signIn.existingSession || signUp.existingSession) {
          const sessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId
          if (sessionId) {
            await activateExistingSession(sessionId)
            return
          }
        }

        if (signUp.isTransferable) {
          await signIn.create({ transfer: true })
          const signInStatus = signIn.status as typeof signIn.status | 'complete'
          if (signInStatus === 'complete') {
            await signIn.finalize({
              navigate: navigateAfterFinalize,
            })
            return
          }
          navigateToSignIn()
          return
        }

        if (
          signIn.status === 'needs_first_factor' &&
          !signIn.supportedFirstFactors?.every((f) => f.strategy === 'enterprise_sso')
        ) {
          navigateToSignIn()
          return
        }

        if (signIn.isTransferable) {
          await signUp.create({ transfer: true })
          if (signUp.status === 'complete') {
            await signUp.finalize({
              navigate: navigateAfterFinalize,
            })
            return
          }
          navigateToSignUp()
          return
        }

        if (signUp.status === 'complete') {
          await signUp.finalize({
            navigate: navigateAfterFinalize,
          })
          return
        }

        if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_new_password') {
          navigateToSignIn()
          return
        }
      } catch (error) {
        if (isSessionExistsError(error) || clerk.session) {
          navigateHome()
          return
        }
        navigateToSignIn()
      }
    })()
    // navigate helpers are stable wrappers; including them retriggers on unrelated Clerk updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once when Clerk + router are ready
  }, [clerk, clerk.loaded, router, signIn, signUp])

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div id="clerk-captcha" />
    </div>
  )
}
