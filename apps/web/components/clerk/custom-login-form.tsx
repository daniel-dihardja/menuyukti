'use client'

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs'
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

function isSignUpIfMissingTransfer(error: unknown): boolean {
  return clerkErrorHasCode(error, 'sign_up_if_missing_transfer')
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

/** Sign-in create failed because no user exists — fall back to explicit sign-up. */
function isIdentifierNotFound(error: unknown): boolean {
  if (
    clerkErrorHasCode(error, 'form_identifier_not_found') ||
    clerkErrorHasCode(error, 'identifier_not_found')
  ) {
    return true
  }
  return /couldn'?t find your account/i.test(clerkErrorMessage(error))
}

type Step = 'email' | 'code' | 'second_factor' | 'client_trust'
type AuthFlow = 'sign-in' | 'sign-up'

/** Primary MFA strategy to drive send + verify (Clerk custom MFA flow). */
function getPrimarySecondFactor(signIn: {
  supportedSecondFactors?: Array<{ strategy: string }> | null
}): string | null {
  const factors = signIn.supportedSecondFactors ?? []
  if (factors.length === 0) {
    return null
  }
  const order = ['phone_code', 'email_code', 'totp', 'backup_code']
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
  const { signUp, errors: signUpErrors, fetchStatus: signUpFetchStatus } = useSignUp()
  const [step, setStep] = useState<Step>('email')
  const [flow, setFlow] = useState<AuthFlow>('sign-in')
  const [busy, setBusy] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
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

  const finalizeSignUpAndRedirect = useCallback(async () => {
    if (!signUp) return
    await signUp.finalize({ navigate: navigateAfterAuth })
  }, [navigateAfterAuth, signUp])

  const transferToSignUp = useCallback(async () => {
    if (!signUp) return
    const { error } = await signUp.create({ transfer: true })
    if (error) {
      setFormError(t('genericError'))
      return
    }
    if (signUp.status === 'complete') {
      await finalizeSignUpAndRedirect()
      return
    }
    const missing = signUp.missingFields ?? []
    setFormError(
      missing.includes('password') ? t('signUpPasswordStillRequired') : t('genericError'),
    )
  }, [finalizeSignUpAndRedirect, signUp, t])

  /** Explicit sign-up when sign-in reports no account (signUpIfMissing unavailable / Invite-only quirks). */
  const startSignUpWithEmail = useCallback(
    async (email: string): Promise<boolean> => {
      if (!signUp) return false
      const { error } = await signUp.create({ emailAddress: email })
      if (error) {
        setFormError(t('genericError'))
        return false
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode()
      if (sendError) {
        setFormError(t('genericError'))
        return false
      }
      setFlow('sign-up')
      setEmailAddress(email)
      setStep('code')
      return true
    },
    [signUp, t],
  )

  const ensureVerificationCodeSent = useCallback(async () => {
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
      } else if (signIn.status === 'needs_client_trust') {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code',
        )
        if (emailCodeFactor) {
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

  const ensureVerificationCodeSentRef = useRef(ensureVerificationCodeSent)
  ensureVerificationCodeSentRef.current = ensureVerificationCodeSent

  useEffect(() => {
    if (!signIn) return
    const status = signIn.status
    const isPendingVerification =
      status === 'needs_second_factor' || status === 'needs_client_trust'
    if (!isPendingVerification || (step !== 'email' && step !== 'code')) return

    setMfaLoading(true)
    void (async () => {
      try {
        await ensureVerificationCodeSentRef.current()
        if (status === 'needs_second_factor') {
          setStep('second_factor')
        } else if (status === 'needs_client_trust') {
          setStep('client_trust')
        }
      } finally {
        setMfaLoading(false)
      }
    })()
    // signIn object identity changes each render; id/status capture the reactive fields we need.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureVerificationCodeSentRef always calls latest callback
  }, [signIn?.id, signIn?.status, step])

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn || !signUp || busy) return

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()

    setBusy(true)
    setFormError(null)
    try {
      // Combined sign-in-or-up: prefer signUpIfMissing; fall back to explicit sign-up.
      const { error: createError } = await signIn.create({
        identifier: email,
        signUpIfMissing: true,
      })
      if (createError) {
        if (isIdentifierNotFound(createError)) {
          await startSignUpWithEmail(email)
          return
        }
        return
      }

      const { error: sendError } = await signIn.emailCode.sendCode({ emailAddress: email })
      if (sendError) {
        if (isIdentifierNotFound(sendError)) {
          await startSignUpWithEmail(email)
          return
        }
        return
      }

      setFlow('sign-in')
      setEmailAddress(email)

      if (signIn.status === 'complete') {
        await finalizeAndRedirect()
        return
      }

      if (signIn.status === 'needs_second_factor') {
        await ensureVerificationCodeSent()
        setStep('second_factor')
        return
      }

      if (signIn.status === 'needs_client_trust') {
        await ensureVerificationCodeSent()
        setStep('client_trust')
        return
      }

      setStep('code')
    } finally {
      setBusy(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return

    const form = e.currentTarget
    const code = (form.elements.namedItem('verification-code') as HTMLInputElement).value.trim()

    setBusy(true)
    setFormError(null)
    try {
      if (flow === 'sign-up') {
        if (!signUp) return
        const { error } = await signUp.verifications.verifyEmailCode({ code })
        if (error) {
          return
        }
        if (signUp.status === 'complete') {
          await finalizeSignUpAndRedirect()
          return
        }
        const missing = signUp.missingFields ?? []
        setFormError(
          missing.includes('password') ? t('signUpPasswordStillRequired') : t('genericError'),
        )
        return
      }

      if (!signIn) return
      const { error } = await signIn.emailCode.verifyCode({ code })
      if (error) {
        if (isSignUpIfMissingTransfer(error)) {
          await transferToSignUp()
          return
        }
        return
      }

      if (signIn.status === 'complete') {
        await finalizeAndRedirect()
        return
      }

      if (signIn.status === 'needs_second_factor') {
        await ensureVerificationCodeSent()
        setStep('second_factor')
        return
      }

      if (signIn.status === 'needs_client_trust') {
        await ensureVerificationCodeSent()
        setStep('client_trust')
        return
      }
    } finally {
      setBusy(false)
    }
  }

  const handleResendCode = () => {
    if (flow === 'sign-up') {
      void signUp?.verifications.sendEmailCode()
      return
    }
    void signIn?.emailCode.sendCode({ emailAddress })
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

  const handleVerifyTrust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn || busy) return

    const form = e.currentTarget
    const code = (form.elements.namedItem('verification-code') as HTMLInputElement).value.trim()

    setBusy(true)
    try {
      await signIn.mfa.verifyEmailCode({ code })
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
      if (signUp) {
        await signUp.reset()
      }
      preparingSignInIdRef.current = null
      preparedSignInIdRef.current = null
      setPrimarySecondFactor(null)
      setEmailAddress('')
      setOauthError(null)
      setFormError(null)
      setFlow('sign-in')
      setStep('email')
    } finally {
      setBusy(false)
    }
  }

  const codeFieldError =
    flow === 'sign-up' ? signUpErrors?.fields?.code?.message : errors?.fields?.code?.message
  const identifierError = errors?.fields?.identifier
  const identifierErrorCode =
    identifierError && typeof identifierError === 'object' && 'code' in identifierError
      ? (identifierError as { code?: string }).code
      : undefined
  const showIdentifierError =
    Boolean(identifierError?.message) &&
    identifierErrorCode !== 'form_identifier_not_found' &&
    identifierErrorCode !== 'identifier_not_found' &&
    !/couldn'?t find your account/i.test(identifierError?.message ?? '')

  const loading =
    busy ||
    fetchStatus === 'fetching' ||
    signUpFetchStatus === 'fetching' ||
    mfaLoading ||
    oauthBusy
  const isSigningIn = loading

  const mfaHint =
    primarySecondFactor === 'phone_code'
      ? t('mfaHintSms')
      : primarySecondFactor === 'email_code'
        ? t('mfaHintEmail')
        : primarySecondFactor === 'backup_code'
          ? t('useBackupCode')
          : t('mfaHintTotp')

  if (!signIn || !signUp) {
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

  if (step === 'client_trust') {
    return (
      <div className={cn('space-y-6', className)}>
        <form onSubmit={handleVerifyTrust} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verification-code">{t('verificationCodeLabel')}</FieldLabel>
              <Input
                key="client-trust-code"
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

  if (step === 'code') {
    return (
      <div className={cn('space-y-6', className)}>
        <p className="text-sm text-muted-foreground" role="status">
          {t('otpHintEmail', { email: emailAddress })}
        </p>
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verification-code">{t('verificationCodeLabel')}</FieldLabel>
              <Input
                key="sign-in-code"
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
              {codeFieldError ? (
                <p className="text-sm text-destructive" role="alert">
                  {codeFieldError}
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
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={isSigningIn}
            onClick={handleResendCode}
          >
            {t('resendCode')}
          </Button>
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
        <ClerkCaptcha />
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
              disabled={isSigningIn}
              className="text-base py-2"
            />
            {showIdentifierError ? (
              <p className="text-sm text-destructive" role="alert">
                {identifierError?.message}
              </p>
            ) : null}
            {formError && step === 'email' ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </Field>

          <Field>
            <Button type="submit" size="lg" className="w-full" disabled={isSigningIn}>
              {busy ? t('sendingCode') : t('continueWithEmail')}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <ClerkCaptcha />
    </div>
  )
}
