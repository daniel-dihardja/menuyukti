'use client'

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs'
import { routes } from '@/lib/routes'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

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

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              return
            }
            const url = decorateUrl(routes.dashboard)
            if (url.startsWith('http')) {
              window.location.href = url
            } else {
              router.push(url)
            }
          },
        })
        return
      }

      if (signUp.isTransferable) {
        await signIn.create({ transfer: true })
        const signInStatus = signIn.status as typeof signIn.status | 'complete'
        if (signInStatus === 'complete') {
          await signIn.finalize({
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) {
                return
              }
              const url = decorateUrl(routes.dashboard)
              if (url.startsWith('http')) {
                window.location.href = url
              } else {
                router.push(url)
              }
            },
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
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) {
                return
              }
              const url = decorateUrl(routes.dashboard)
              if (url.startsWith('http')) {
                window.location.href = url
              } else {
                router.push(url)
              }
            },
          })
          return
        }
        navigateToSignUp()
        return
      }

      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              return
            }
            const url = decorateUrl(routes.dashboard)
            if (url.startsWith('http')) {
              window.location.href = url
            } else {
              router.push(url)
            }
          },
        })
        return
      }

      if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_new_password') {
        navigateToSignIn()
        return
      }

      if (signIn.existingSession || signUp.existingSession) {
        const sessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId
        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) {
                return
              }
              const url = decorateUrl(routes.dashboard)
              if (url.startsWith('http')) {
                window.location.href = url
              } else {
                router.push(url)
              }
            },
          })
        }
      }
    })()
    // navigateToSignIn / navigateToSignUp are stable wrappers; including them retriggers on unrelated Clerk updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once when Clerk + router are ready
  }, [clerk, clerk.loaded, router, signIn, signUp])

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div id="clerk-captcha" />
    </div>
  )
}
