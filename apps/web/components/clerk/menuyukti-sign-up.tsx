'use client'

import { useAuth, useClerk, useSignUp } from '@clerk/nextjs'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { routes } from '@/lib/routes'
import { GoogleMark } from '@/components/clerk/google-mark'
import { isGoogleOauthAvailable } from '@/components/clerk/is-google-oauth-available'
import { cn } from '@workspace/ui/lib/utils'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

type Step = 'email' | 'code'

function navigateHome(decorateUrl: (url: string) => string): void {
  const url = decorateUrl(routes.authContinue)
  // Hard navigation so the session cookie is picked up by the Next.js proxy.
  window.location.assign(url)
}

export function MenuyuktiSignUp({ className }: { className?: string }) {
  const t = useTranslations('login')
  const clerk = useClerk()
  const { isSignedIn } = useAuth()
  const { signUp, errors, fetchStatus } = useSignUp()
  const [step, setStep] = useState<Step>('email')
  const [busy, setBusy] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const finalizingRef = useRef(false)
  const googleAvailable = isGoogleOauthAvailable(clerk)

  const finalizeAndRedirect = useCallback(async () => {
    if (!signUp || finalizingRef.current) return
    finalizingRef.current = true
    try {
      await signUp.finalize({
        navigate: async ({ decorateUrl }) => {
          // Always leave the sign-up page. Skipping navigate when session.currentTask
          // was set left users stuck on "Creating your account…".
          navigateHome(decorateUrl)
        },
      })
    } catch {
      finalizingRef.current = false
      setFormError(t('genericError'))
    }
  }, [signUp, t])

  // If the session is already active (e.g. finalize set the cookie but soft nav failed).
  useEffect(() => {
    if (!clerk.loaded || !isSignedIn) return
    window.location.assign(routes.authContinue)
  }, [clerk.loaded, isSignedIn])

  // Complete sign-up if status reaches complete outside the submit handler.
  useEffect(() => {
    if (!signUp || signUp.status !== 'complete' || isSignedIn) return
    void finalizeAndRedirect()
  }, [finalizeAndRedirect, isSignedIn, signUp, signUp?.status])

  // After create + send code, Clerk reports missing_requirements + unverified email.
  useEffect(() => {
    if (!signUp) return
    const awaitingEmailCode =
      signUp.status === 'missing_requirements' &&
      (signUp.unverifiedFields?.includes('email_address') ?? false)
    if (awaitingEmailCode) {
      setStep('code')
    }
  }, [signUp, signUp?.status, signUp?.unverifiedFields])

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signUp || busy) return

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()

    setBusy(true)
    setFormError(null)
    try {
      const { error } = await signUp.create({ emailAddress: email })
      if (error) {
        return
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode()
      if (sendError) {
        return
      }

      setEmailAddress(email)
      setStep('code')
    } finally {
      setBusy(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signUp || busy) return

    const form = e.currentTarget
    const code = (form.elements.namedItem('verification-code') as HTMLInputElement).value.trim()

    setBusy(true)
    setFormError(null)
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code })
      if (error) {
        return
      }

      if (signUp.status === 'complete') {
        await finalizeAndRedirect()
        return
      }

      // Email verified but Clerk still requires other fields (often password if Dashboard
      // still has Password enabled).
      const missing = signUp.missingFields ?? []
      if (missing.length > 0) {
        setFormError(
          missing.includes('password') ? t('signUpPasswordStillRequired') : t('genericError'),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!signUp || busy || oauthBusy) return
    setOauthBusy(true)
    setFormError(null)
    try {
      const { error } = await signUp.sso({
        strategy: 'oauth_google',
        redirectUrl: routes.authContinue,
        redirectCallbackUrl: routes.ssoCallback,
      })
      if (error) {
        setFormError(t('genericError'))
      }
    } catch {
      setFormError(t('genericError'))
    } finally {
      setOauthBusy(false)
    }
  }

  const handleStartOver = async () => {
    if (!signUp) return
    setBusy(true)
    setFormError(null)
    finalizingRef.current = false
    try {
      await signUp.reset()
      setEmailAddress('')
      setStep('email')
    } finally {
      setBusy(false)
    }
  }

  const loading = busy || fetchStatus === 'fetching' || finalizingRef.current || oauthBusy

  if (!clerk.loaded || !signUp) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)} aria-live="polite">
        {t('signingUp')}
      </div>
    )
  }

  if (isSignedIn || signUp.status === 'complete') {
    return (
      <div className={cn('text-sm text-muted-foreground', className)} aria-live="polite">
        {t('signingUp')}
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className={cn('space-y-6', className)}>
        <p className="text-sm text-muted-foreground" role="status">
          {t('otpHintEmail', { email: emailAddress || t('emailLabel').toLowerCase() })}
        </p>
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verification-code">{t('verificationCodeLabel')}</FieldLabel>
              <Input
                key="sign-up-code"
                id="verification-code"
                name="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder={t('verificationCodePlaceholder')}
                required
                disabled={busy}
                className="text-base py-2"
              />
              {errors?.fields?.code?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.fields.code.message}
                </p>
              ) : null}
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </Field>
            <Field>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? t('signingUp') : t('verify')}
              </Button>
            </Field>
          </FieldGroup>
        </form>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={loading}
            onClick={() => signUp.verifications.sendEmailCode()}
          >
            {t('resendCode')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={loading}
            onClick={handleStartOver}
          >
            {t('startOver')}
          </Button>
        </div>
        <div id="clerk-captcha" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {googleAvailable ? (
        <>
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={() => void handleGoogleSignUp()}
            >
              <GoogleMark />
              {oauthBusy ? t('signingInWithGoogle') : t('continueWithGoogle')}
            </Button>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <div
            className="relative flex items-center gap-3"
            role="separator"
            aria-label={t('orContinueWithEmail')}
          >
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground shrink-0 text-xs uppercase tracking-wide">
              {t('orContinueWithEmail')}
            </span>
            <div className="bg-border h-px flex-1" />
          </div>
        </>
      ) : null}

      <form onSubmit={handleEmailSubmit} className="space-y-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email" className="text-base font-medium text-foreground">
              {t('emailLabel')}
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder={t('emailPlaceholder')}
              required
              disabled={loading}
              className="text-base py-2"
            />
            {errors?.fields?.emailAddress?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.fields.emailAddress.message}
              </p>
            ) : null}
          </Field>

          <Field>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {busy ? t('sendingCode') : t('continueWithEmail')}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('loginDescription')}{' '}
        <Link
          href={routes.login}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('loginLink')}
        </Link>
      </p>

      <div id="clerk-captcha" />
    </div>
  )
}
