'use client'

import { useSignIn } from '@clerk/nextjs'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useRef, useState } from 'react'

type Step = 'password' | 'second_factor' | 'client_trust'

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
  const { signIn, errors, fetchStatus } = useSignIn()
  const [step, setStep] = useState<Step>('password')
  const [busy, setBusy] = useState(false)
  const [primarySecondFactor, setPrimarySecondFactor] = useState<string | null>(null)
  const lastPreparedSignInId = useRef<string | null>(null)

  const finalizeAndRedirect = useCallback(async () => {
    if (!signIn) return
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
  }, [router, signIn])

  const prepareSecondFactor = useCallback(async () => {
    if (!signIn) return
    const signInId = signIn.id ?? null
    if (signInId && lastPreparedSignInId.current === signInId) {
      return
    }
    if (signInId) {
      lastPreparedSignInId.current = signInId
    }
    const primary = getPrimarySecondFactor(signIn)
    setPrimarySecondFactor(primary)
    if (primary === 'phone_code') {
      await signIn.mfa.sendPhoneCode()
    } else if (primary === 'email_code') {
      await signIn.mfa.sendEmailCode()
    }
  }, [signIn])

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn || busy) return

    const form = e.currentTarget
    const emailAddress = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setBusy(true)
    try {
      const { error } = await signIn.password({ emailAddress, password })
      if (error) {
        return
      }

      if (signIn.status === 'complete') {
        await finalizeAndRedirect()
        return
      }

      if (signIn.status === 'needs_second_factor') {
        await prepareSecondFactor()
        setStep('second_factor')
        return
      }

      if (signIn.status === 'needs_client_trust') {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code',
        )
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode()
        }
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

  const handleStartOver = async () => {
    if (!signIn) return
    setBusy(true)
    try {
      await signIn.reset()
      lastPreparedSignInId.current = null
      setPrimarySecondFactor(null)
      setStep('password')
    } finally {
      setBusy(false)
    }
  }

  const loading = busy || fetchStatus === 'fetching'
  const isSigningIn = loading

  if (!signIn) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)} aria-live="polite">
        {t('signingIn')}
      </div>
    )
  }

  if (step === 'second_factor') {
    return (
      <div className={cn('space-y-6', className)}>
        <form onSubmit={handleSecondFactorSubmit} className="space-y-4" autoComplete="off">
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
                spellCheck={false}
                placeholder={t('verificationCodePlaceholder')}
                required
                readOnly
                onFocus={(e) => {
                  e.currentTarget.readOnly = false
                }}
                disabled={!signIn || isSigningIn}
                className="text-base py-2"
              />
              {errors?.fields?.code?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.fields.code.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <Button type="submit" className="w-full text-base py-3" disabled={isSigningIn}>
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
        <form onSubmit={handleVerifyTrust} className="space-y-4" autoComplete="off">
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
                spellCheck={false}
                placeholder={t('verificationCodePlaceholder')}
                required
                readOnly
                onFocus={(e) => {
                  e.currentTarget.readOnly = false
                }}
                disabled={!signIn || isSigningIn}
                className="text-base py-2"
              />
              {errors?.fields?.code?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.fields.code.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <Button type="submit" className="w-full text-base py-3" disabled={isSigningIn}>
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

  return (
    <div className={cn('space-y-6', className)}>
      <form onSubmit={handlePasswordSubmit} className="space-y-8">
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
            <FieldLabel htmlFor="password" className="text-base font-medium text-foreground">
              {t('passwordLabel')}
            </FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isSigningIn}
              className="text-base py-2"
            />
            {errors?.fields?.password?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.fields.password.message}
              </p>
            ) : null}
          </Field>

          <Field>
            <Button type="submit" className="w-full text-base py-3" disabled={isSigningIn}>
              {isSigningIn ? t('signingIn') : t('loginButton')}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div id="clerk-captcha" />
    </div>
  )
}
