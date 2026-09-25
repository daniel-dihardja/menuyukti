'use client'

import { useClerk, useSignIn } from '@clerk/nextjs'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { routes } from '@/lib/routes'
import {
  AUTH_RETURN_TO_QUERY,
  buildAuthContinueUrl,
  rememberAuthReturnPath,
} from '@/lib/auth-return-path'
import { GoogleMark } from '@/components/clerk/google-mark'
import { isGoogleOauthAvailable } from '@/components/clerk/is-google-oauth-available'
import { cn } from '@workspace/ui/lib/utils'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

type Step = 'email' | 'code' | 'second_factor' | 'client_trust'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get(AUTH_RETURN_TO_QUERY)
  const continueUrl = buildAuthContinueUrl(returnTo)
  const clerk = useClerk()
  const { signIn, errors, fetchStatus } = useSignIn()
  const [step, setStep] = useState<Step>('email')
  const [busy, setBusy] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [primarySecondFactor, setPrimarySecondFactor] = useState<string | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const preparingSignInIdRef = useRef<string | null>(null)
  const preparedSignInIdRef = useRef<string | null>(null)
  const googleAvailable = isGoogleOauthAvailable(clerk)

  useEffect(() => {
    rememberAuthReturnPath(returnTo)
  }, [returnTo])

  const finalizeAndRedirect = useCallback(async () => {
    if (!signIn) return
    await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          return
        }
        const url = decorateUrl(continueUrl)
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          router.push(url)
        }
      },
    })
  }, [continueUrl, router, signIn])

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
    if (!signIn || busy) return

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()

    setBusy(true)
    try {
      const { error: createError } = await signIn.create({ identifier: email })
      if (createError) {
        return
      }

      const { error: sendError } = await signIn.emailCode.sendCode({ emailAddress: email })
      if (sendError) {
        return
      }

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
    if (!signIn || busy) return

    const form = e.currentTarget
    const code = (form.elements.namedItem('verification-code') as HTMLInputElement).value.trim()

    setBusy(true)
    try {
      const { error } = await signIn.emailCode.verifyCode({ code })
      if (error) {
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
    if (!signIn || busy || oauthBusy) return
    setOauthBusy(true)
    setOauthError(null)
    try {
      const { error } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: continueUrl,
        redirectCallbackUrl: routes.ssoCallback,
      })
      if (error) {
        setOauthError(t('genericError'))
      }
    } catch {
      setOauthError(t('genericError'))
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
      setEmailAddress('')
      setOauthError(null)
      setStep('email')
    } finally {
      setBusy(false)
    }
  }

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
            onClick={() => signIn.emailCode.sendCode({ emailAddress })}
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
              disabled={isSigningIn}
              onClick={() => void handleGoogleSignIn()}
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
            {errors?.fields?.identifier?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.fields.identifier.message}
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

      <p className="text-center text-sm text-muted-foreground">
        {t('signupDescription')}{' '}
        <Link
          href={routes.signUp}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t('signupLink')}
        </Link>
      </p>

      <div id="clerk-captcha" />
    </div>
  )
}
