'use client'

import { useClerk, useSignIn } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  AUTH_RETURN_TO_QUERY,
  buildAuthContinueUrl,
  rememberAuthReturnPath,
} from '@/lib/auth-return-path'
import { isCaptchaOauthError, startGoogleOauthSignIn } from '@/lib/start-google-oauth'
import { ClerkCaptcha } from '@/components/clerk/clerk-captcha'
import { GoogleMark } from '@/components/clerk/google-mark'
import { isGoogleOauthAvailable } from '@/components/clerk/is-google-oauth-available'
import { cn } from '@workspace/ui/lib/utils'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

function clerkErrorHasCode(error: unknown, code: string): boolean {
  if (!error) return false
  if (isClerkAPIResponseError(error)) {
    return error.errors.some((e) => e.code === code)
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code === code
  }
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const errors = (error as { errors?: Array<{ code?: string }> }).errors
    return Boolean(errors?.some((e) => e.code === code))
  }
  return false
}

function clerkErrorMessage(error: unknown): string {
  if (!error) return ''
  if (isClerkAPIResponseError(error)) {
    return error.errors.map((e) => e.message).join(' ')
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const errors = (error as { errors?: Array<{ message?: string }> }).errors
    return (errors ?? []).map((e) => e.message ?? '').join(' ')
  }
  return ''
}

type Step = 'credentials' | 'second_factor'

/** Primary MFA strategy to drive send + verify (Clerk custom MFA flow). */
function getPrimarySecondFactor(signIn: {
  supportedSecondFactors?: Array<{ strategy: string }> | null
}): string | null {
  const factors = signIn.supportedSecondFactors ?? []
  if (factors.length === 0) {
    return null
  }
  const order = ['phone_code', 'totp', 'backup_code', 'email_code']
  for (const s of order) {
    if (factors.some((f) => f.strategy === s)) {
      return s
    }
  }
  return factors[0]?.strategy ?? null
}

export function CustomLoginForm({ className }: { className?: string }) {
  const t = useTranslations('login')
  const searchParams = useSearchParams()
  const returnTo = searchParams.get(AUTH_RETURN_TO_QUERY)
  const continueUrl = buildAuthContinueUrl(returnTo)
  const clerk = useClerk()
  const { signIn, errors, fetchStatus } = useSignIn()
  const [step, setStep] = useState<Step>('credentials')
  const [busy, setBusy] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [primarySecondFactor, setPrimarySecondFactor] = useState<string | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const preparingSignInIdRef = useRef<string | null>(null)
  const preparedSignInIdRef = useRef<string | null>(null)
  const googleAvailable = isGoogleOauthAvailable(clerk)

  useEffect(() => {
    rememberAuthReturnPath(returnTo)
  }, [returnTo])

  const navigateAfterAuth = useCallback(
    async ({
      session,
      decorateUrl,
    }: {
      session: { currentTask?: unknown } | null | undefined
      decorateUrl: (url: string) => string
    }) => {
      if (session?.currentTask) {
        return
      }
      const url = decorateUrl(continueUrl)
      if (url.startsWith('http')) {
        window.location.href = url
      } else {
        // Hard navigation so the session cookie is visible to the Next.js proxy.
        window.location.assign(url)
      }
    },
    [continueUrl],
  )

  const finalizeAndRedirect = useCallback(async () => {
    if (!signIn) return
    await signIn.finalize({ navigate: navigateAfterAuth })
  }, [navigateAfterAuth, signIn])

  const ensureMfaCodeSent = useCallback(async () => {
    if (!signIn?.id) return

    const signInId = signIn.id
    if (preparedSignInIdRef.current === signInId || preparingSignInIdRef.current === signInId) {
      return
    }

    preparingSignInIdRef.current = signInId
    try {
      if (signIn.status === 'needs_second_factor') {
        const primary = getPrimarySecondFactor(signIn)
        setPrimarySecondFactor(primary)
        if (primary === 'phone_code') {
          await signIn.mfa.sendPhoneCode()
        } else if (primary === 'email_code') {
          await signIn.mfa.sendEmailCode()
        }
      }
      preparedSignInIdRef.current = signInId
    } finally {
      if (preparingSignInIdRef.current === signInId) {
        preparingSignInIdRef.current = null
      }
    }
  }, [signIn])

  const ensureMfaCodeSentRef = useRef(ensureMfaCodeSent)
  ensureMfaCodeSentRef.current = ensureMfaCodeSent

  useEffect(() => {
    if (!signIn) return
    if (signIn.status !== 'needs_second_factor' || step !== 'credentials') return

    setMfaLoading(true)
    void (async () => {
      try {
        await ensureMfaCodeSentRef.current()
        setStep('second_factor')
      } finally {
        setMfaLoading(false)
      }
    })()
    // signIn object identity changes each render; id/status capture the reactive fields we need.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureMfaCodeSentRef always calls latest callback
  }, [signIn?.id, signIn?.status, step])

  const handleCredentialsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn || busy) return

    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setBusy(true)
    setFormError(null)
    try {
      const { error } = await signIn.password({
        identifier: username,
        password,
      })
      if (error) {
        return
      }

      if (signIn.status === 'complete') {
        await finalizeAndRedirect()
        return
      }

      if (signIn.status === 'needs_second_factor') {
        await ensureMfaCodeSent()
        setStep('second_factor')
        return
      }

      // Device Trust / email challenges are unsupported for username-only sign-in.
      setFormError(t('clientTrustUnsupported'))
    } finally {
      setBusy(false)
    }
  }

  const handleSecondFactorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn || busy) return

    const form = e.currentTarget
    const code = (form.elements.namedItem('verification-code') as HTMLInputElement).value.trim()

    setBusy(true)
    try {
      if (primarySecondFactor === 'backup_code') {
        await signIn.mfa.verifyBackupCode({ code })
      } else if (primarySecondFactor === 'phone_code') {
        await signIn.mfa.verifyPhoneCode({ code })
      } else if (primarySecondFactor === 'email_code') {
        await signIn.mfa.verifyEmailCode({ code })
      } else {
        await signIn.mfa.verifyTOTP({ code })
      }

      if (signIn.status === 'complete') {
        await finalizeAndRedirect()
      }
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (busy || oauthBusy) return
    if (clerk.session) {
      window.location.assign(continueUrl)
      return
    }
    if (!signIn) {
      setOauthError(t('genericError'))
      return
    }
    setOauthBusy(true)
    setOauthError(null)
    try {
      const { error } = await startGoogleOauthSignIn({
        signIn,
        redirectUrl: continueUrl,
      })
      if (error) {
        if (clerkErrorHasCode(error, 'session_exists') || clerk.session) {
          window.location.assign(continueUrl)
          return
        }
        setOauthError(
          isCaptchaOauthError(error)
            ? t('captchaError')
            : clerkErrorMessage(error) || t('genericError'),
        )
      } else if (clerk.session) {
        window.location.assign(continueUrl)
      }
    } catch (error) {
      if (clerkErrorHasCode(error, 'session_exists') || clerk.session) {
        window.location.assign(continueUrl)
        return
      }
      setOauthError(
        isCaptchaOauthError(error)
          ? t('captchaError')
          : clerkErrorMessage(error) || t('genericError'),
      )
    } finally {
      setOauthBusy(false)
    }
  }

  const handleStartOver = async () => {
    if (!signIn) return
    setBusy(true)
    try {
      await signIn.reset()
      preparingSignInIdRef.current = null
      preparedSignInIdRef.current = null
      setPrimarySecondFactor(null)
      setOauthError(null)
      setFormError(null)
      setStep('credentials')
    } finally {
      setBusy(false)
    }
  }

  const identifierError = errors?.fields?.identifier
  const passwordError = errors?.fields?.password

  const loading = busy || fetchStatus === 'fetching' || mfaLoading || oauthBusy
  const isSigningIn = loading

  const mfaHint =
    primarySecondFactor === 'phone_code'
      ? t('mfaHintSms')
      : primarySecondFactor === 'email_code'
        ? t('mfaHintEmail')
        : primarySecondFactor === 'backup_code'
          ? t('useBackupCode')
          : t('mfaHintTotp')

  if (!signIn) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)} aria-live="polite">
        {t('signingIn')}
      </div>
    )
  }

  if (mfaLoading) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)} aria-live="polite">
        {t('signingIn')}
      </div>
    )
  }

  if (step === 'second_factor') {
    return (
      <div className={cn('space-y-6', className)}>
        <p className="text-sm text-muted-foreground" role="status">
          {mfaHint}
        </p>
        <form onSubmit={handleSecondFactorSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verification-code">{t('verificationCodeLabel')}</FieldLabel>
              <Input
                key="second-factor-code"
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
            </Field>
            <Field>
              <Button type="submit" size="lg" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? t('signingIn') : t('verify')}
              </Button>
            </Field>
          </FieldGroup>
        </form>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          {primarySecondFactor === 'phone_code' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={isSigningIn}
              onClick={() => signIn.mfa.sendPhoneCode()}
            >
              {t('resendCode')}
            </Button>
          ) : primarySecondFactor === 'email_code' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={isSigningIn}
              onClick={() => signIn.mfa.sendEmailCode()}
            >
              {t('resendCode')}
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={isSigningIn}
            onClick={handleStartOver}
          >
            {t('startOver')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {googleAvailable ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={isSigningIn}
            onClick={() => {
              void handleGoogleSignIn()
            }}
          >
            <GoogleMark />
            {oauthBusy ? t('signingInWithGoogle') : t('continueWithGoogle')}
          </Button>
          {oauthError ? (
            <p className="text-sm text-destructive" role="alert">
              {oauthError}
            </p>
          ) : null}
        </div>
      ) : null}

      {googleAvailable ? (
        <div
          className="relative flex items-center gap-3"
          role="separator"
          aria-label={t('orContinueWithUsername')}
        >
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground shrink-0 text-xs uppercase tracking-wide">
            {t('orContinueWithUsername')}
          </span>
          <div className="bg-border h-px flex-1" />
        </div>
      ) : null}

      <form onSubmit={handleCredentialsSubmit} className="space-y-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username" className="text-base font-medium text-foreground">
              {t('usernameLabel')}
            </FieldLabel>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={t('usernamePlaceholder')}
              required
              disabled={isSigningIn}
              className="text-base py-2"
            />
            {identifierError?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {identifierError.message}
              </p>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="password" className="text-base font-medium text-foreground">
              {t('passwordLabel')}
            </FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('passwordPlaceholder')}
              required
              disabled={isSigningIn}
              className="text-base py-2"
            />
            {passwordError?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {passwordError.message}
              </p>
            ) : null}
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </Field>

          <Field>
            <Button type="submit" size="lg" className="w-full" disabled={isSigningIn}>
              {busy ? t('signingIn') : t('signInWithPassword')}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <ClerkCaptcha />
    </div>
  )
}
