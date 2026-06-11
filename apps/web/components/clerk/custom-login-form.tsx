'use client'

import { useSignIn } from '@clerk/nextjs'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

type Step = 'password' | 'second_factor' | 'client_trust'

function getPrimarySecondFactor(signIn: {
  supportedSecondFactors?: Array<{ strategy: string }> | null
}): string | null {
  const factors = signIn.supportedSecondFactors ?? []
  if (factors.length === 0) return null
  const order = ['phone_code', 'email_code', 'totp', 'backup_code']
  for (const s of order) {
    if (factors.some((f) => f.strategy === s)) return s
  }
  return factors[0]?.strategy ?? null
}

export function CustomLoginForm({ className }: { className?: string }) {
  const t = useTranslations('login')
  const router = useRouter()
  const { signIn, errors, fetchStatus } = useSignIn()
  const [step, setStep] = useState<Step>('password')
  const [busy, setBusy] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [primarySecondFactor, setPrimarySecondFactor] = useState<string | null>(null)
  const preparingSignInIdRef = useRef<string | null>(null)
  const preparedSignInIdRef = useRef<string | null>(null)

  const finalizeAndRedirect = useCallback(async () => {
    if (!signIn) return
    await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) return
        const url = decorateUrl(routes.dashboard)
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          router.push(url)
        }
      },
    })
  }, [router, signIn])

  // ✅ Kept from feature: handles both needs_second_factor and needs_client_trust,
  // with deduplication guards to prevent double-sends.
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
    if (!isPendingVerification || step !== 'password') return

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
  }, [signIn?.id, signIn?.status, step])

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn || busy) return

    const form = e.currentTarget
    const emailAddress = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setBusy(true)
    try {
      const { error } = await signIn.password({ emailAddress, password })
      if (error) return

      if (signIn.status === 'complete') {
        await finalizeAndRedirect()
        return
      }

      if (signIn.status === 'needs_second_factor') {
        // ✅ Kept from feature: ensureVerificationCodeSent handles deduplication
        await ensureVerificationCodeSent()
        setStep('second_factor')
        return
      }

      if (signIn.status === 'needs_client_trust') {
        // ✅ Kept from feature: ensureVerificationCodeSent handles client_trust too
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
    // ✅ Kept from develop: matches id/name="verification-code" used throughout the JSX
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
      preparingSignInIdRef.current = null
      preparedSignInIdRef.current = null
      setPrimarySecondFactor(null)
      setStep('password')
    } finally {
      setBusy(false)
    }
  }

  const loading = busy || fetchStatus === 'fetching' || mfaLoading
  const isSigningIn = loading

  // ... rest of JSX unchanged
}